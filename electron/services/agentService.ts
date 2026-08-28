import net from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ssh2 from 'ssh2';
import { SSHKeyItem } from '../../src/types';
import { VaultService } from './vaultService';
import { BiometricsService } from './biometricsService';
import { KeygenService } from './keygenService';
import { YubikeyService } from './yubikeyService';

// OpenSSH Agent Protocol Message Numbers (RFC / OpenSSH spec)
const SSH2_AGENTC_REQUEST_IDENTITIES = 11;
const SSH2_AGENT_IDENTITIES_ANSWER = 12;
const SSH2_AGENTC_SIGN_REQUEST = 13;
const SSH2_AGENT_SIGN_RESPONSE = 14;
const SSH2_AGENT_FAILURE = 30;

// RSA signature flags
const SSH_AGENT_RSA_SHA2_256 = 2;
const SSH_AGENT_RSA_SHA2_512 = 4;

function encodeString(buf: Buffer | string): Buffer {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

function decodeString(buf: Buffer, offset: number): { data: Buffer; nextOffset: number } | null {
  if (offset + 4 > buf.length) return null;
  const len = buf.readUInt32BE(offset);
  if (offset + 4 + len > buf.length) return null;
  return {
    data: buf.subarray(offset + 4, offset + 4 + len),
    nextOffset: offset + 4 + len
  };
}

export class AgentService {
  private server: net.Server | null = null;
  private socketPath: string;

  constructor(
    public vaultService: VaultService,
    public biometricsService: BiometricsService
  ) {
    this.socketPath = process.platform === 'win32'
      ? `\\\\.\\pipe\\itgeek-ssh-agent-${process.pid}`
      : path.join(os.tmpdir(), `itgeek-ssh-agent-${process.pid}.sock`);
    this.startServer();
  }

  public getSocketPath(): string {
    return this.socketPath;
  }

  private startServer() {
    try {
      if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
        try {
          fs.unlinkSync(this.socketPath);
        } catch {}
      }

      this.server = net.createServer((socket) => {
        this.handleSocketConnection(socket);
      });

      this.server.listen(this.socketPath, () => {
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(this.socketPath, 0o600);
          } catch {}
        }
      });

      this.server.on('error', (err) => {
        console.error('AgentService server error:', err);
      });
    } catch (err) {
      console.error('Failed to start AgentService Socket server:', err);
    }
  }

  private extractPublicWire(keyItem: SSHKeyItem): Buffer | null {
    try {
      if (keyItem.publicKey) {
        const parts = keyItem.publicKey.trim().split(/\s+/);
        if (parts.length >= 2) {
          return Buffer.from(parts[1], 'base64');
        }
      }
      // Fallback: parse privateKey
      const parsed = ssh2.utils.parseKey(keyItem.privateKey, keyItem.passphrase);
      if (!(parsed instanceof Error) && typeof (parsed as any).getPublicSSH === 'function') {
        return (parsed as any).getPublicSSH();
      }
    } catch {}
    return null;
  }

  private handleSocketConnection(socket: net.Socket) {
    let incomingBuffer = Buffer.alloc(0);

    const processPackets = async () => {
      while (incomingBuffer.length >= 4) {
        const packetLen = incomingBuffer.readUInt32BE(0);
        if (incomingBuffer.length < 4 + packetLen) {
          // Incomplete packet, wait for more chunks
          break;
        }

        const packet = incomingBuffer.subarray(4, 4 + packetLen);
        incomingBuffer = incomingBuffer.subarray(4 + packetLen);

        if (packet.length === 0) continue;

        const msgType = packet[0];
        const payload = packet.subarray(1);

        if (msgType === SSH2_AGENTC_REQUEST_IDENTITIES) {
          this.handleRequestIdentities(socket);
        } else if (msgType === SSH2_AGENTC_SIGN_REQUEST) {
          await this.handleSignRequest(payload, socket);
        } else {
          // Unsupported message -> send failure
          this.sendFailure(socket);
        }
      }
    };

    socket.on('data', (chunk: Buffer) => {
      incomingBuffer = Buffer.concat([incomingBuffer, chunk]);
      processPackets().catch((err) => {
        console.error('Agent packet error:', err);
        this.sendFailure(socket);
      });
    });

    socket.on('error', () => {
      // client disconnected
    });
  }

  private handleRequestIdentities(socket: net.Socket) {
    try {
      const vData = this.vaultService.getVaultData();
      const keys = vData.keys || [];

      const validEntries: { wire: Buffer; comment: string }[] = [];

      for (const k of keys) {
        const wire = this.extractPublicWire(k);
        if (wire) {
          validEntries.push({ wire, comment: k.name || 'itgeek-key' });
        }
      }

      let body = Buffer.concat([
        Buffer.from([SSH2_AGENT_IDENTITIES_ANSWER]),
        Buffer.alloc(4)
      ]);
      body.writeUInt32BE(validEntries.length, 1);

      for (const entry of validEntries) {
        body = Buffer.concat([
          body,
          encodeString(entry.wire),
          encodeString(entry.comment)
        ]);
      }

      this.sendPacket(socket, body);
    } catch (err) {
      console.error('Failed to handle agent identities request:', err);
      this.sendFailure(socket);
    }
  }

  private async handleSignRequest(payload: Buffer, socket: net.Socket) {
    try {
      // Parse key_blob
      const keyBlobDecoded = decodeString(payload, 0);
      if (!keyBlobDecoded) {
        return this.sendFailure(socket);
      }
      const keyBlob = keyBlobDecoded.data;

      // Parse data_to_sign (challenge)
      const dataDecoded = decodeString(payload, keyBlobDecoded.nextOffset);
      if (!dataDecoded) {
        return this.sendFailure(socket);
      }
      const dataToSign = dataDecoded.data;

      // Parse flags
      let flags = 0;
      if (dataDecoded.nextOffset + 4 <= payload.length) {
        flags = payload.readUInt32BE(dataDecoded.nextOffset);
      }

      // Find matching key from vault
      const vData = this.vaultService.getVaultData();
      const keys = vData.keys || [];

      let matchedKey: SSHKeyItem | null = null;
      for (const k of keys) {
        const wire = this.extractPublicWire(k);
        if (wire && wire.equals(keyBlob)) {
          matchedKey = k;
          break;
        }
      }

      if (!matchedKey) {
        console.warn('Agent sign request: No matching key found in vault');
        return this.sendFailure(socket);
      }

      // Prompt Touch ID confirmation only for Touch ID protected keys
      if (matchedKey.touchIdProtected) {
        const promptReason = `SSH 代理正在請求調用受保護私鑰「${matchedKey.name}」，請按壓指紋授權`;
        const approved = await this.biometricsService.promptTouchID(promptReason);

        if (!approved) {
          console.warn(`Touch ID rejected or cancelled for key: ${matchedKey.name}`);
          return this.sendFailure(socket);
        }
      }

      // User authorized! Perform signature computation locally
      const rawPriv = YubikeyService.extractRawKey(matchedKey.privateKey);
      const normalizedPriv = KeygenService.normalizePrivateKey(rawPriv, matchedKey.passphrase) || rawPriv;
      let sigWire: Buffer | null = null;

      // 1. First attempt: Use ssh2.utils.parseKey (supports OpenSSH PEM, PKCS#1, PuTTY)
      try {
        const parsed = ssh2.utils.parseKey(normalizedPriv, matchedKey.passphrase);
        if (!(parsed instanceof Error)) {
          const p = Array.isArray(parsed) ? parsed[0] : parsed;
          if (p && typeof p.sign === 'function') {
            if (p.type === 'ssh-ed25519') {
              const rawSig = p.sign(dataToSign);
              if (Buffer.isBuffer(rawSig)) {
                sigWire = Buffer.concat([
                  encodeString('ssh-ed25519'),
                  encodeString(rawSig)
                ]);
              }
            } else {
              // RSA signing
              let hashAlgo = 'sha1';
              let sigFormat = 'ssh-rsa';
              if (flags & SSH_AGENT_RSA_SHA2_512) {
                hashAlgo = 'sha512';
                sigFormat = 'rsa-sha2-512';
              } else if (flags & SSH_AGENT_RSA_SHA2_256) {
                hashAlgo = 'sha256';
                sigFormat = 'rsa-sha2-256';
              }
              const rawSig = p.sign(dataToSign, hashAlgo);
              if (Buffer.isBuffer(rawSig)) {
                sigWire = Buffer.concat([
                  encodeString(sigFormat),
                  encodeString(rawSig)
                ]);
              }
            }
          }
        }
      } catch (parseErr) {
        console.warn('ssh2.utils.parseKey sign warning:', parseErr);
      }

      // 2. Fallback: Node.js crypto signing (for standard PKCS#8 PEM)
      if (!sigWire) {
        try {
          const privKeyObj = crypto.createPrivateKey({
            key: normalizedPriv,
            format: 'pem',
            passphrase: matchedKey.passphrase
          });
          if (matchedKey.type === 'ed25519') {
            const sig = crypto.sign(null, dataToSign, privKeyObj);
            sigWire = Buffer.concat([
              encodeString('ssh-ed25519'),
              encodeString(sig)
            ]);
          } else {
            let hashAlgo = 'sha1';
            let sigFormat = 'ssh-rsa';
            if (flags & SSH_AGENT_RSA_SHA2_512) {
              hashAlgo = 'sha512';
              sigFormat = 'rsa-sha2-512';
            } else if (flags & SSH_AGENT_RSA_SHA2_256) {
              hashAlgo = 'sha256';
              sigFormat = 'rsa-sha2-256';
            }
            const sig = crypto.sign(hashAlgo, dataToSign, privKeyObj);
            sigWire = Buffer.concat([
              encodeString(sigFormat),
              encodeString(sig)
            ]);
          }
        } catch (cryptoErr) {
          console.error('Crypto fallback sign error:', cryptoErr);
        }
      }

      if (!sigWire) {
        console.error('Failed to compute signature for key:', matchedKey.name);
        return this.sendFailure(socket);
      }

      const responseBody = Buffer.concat([
        Buffer.from([SSH2_AGENT_SIGN_RESPONSE]),
        encodeString(sigWire)
      ]);

      this.sendPacket(socket, responseBody);
    } catch (err) {
      console.error('Agent sign error:', err);
      this.sendFailure(socket);
    }
  }

  private sendFailure(socket: net.Socket) {
    this.sendPacket(socket, Buffer.from([SSH2_AGENT_FAILURE]));
  }

  private sendPacket(socket: net.Socket, body: Buffer) {
    if (socket.destroyed) return;
    const header = Buffer.alloc(4);
    header.writeUInt32BE(body.length, 0);
    socket.write(Buffer.concat([header, body]));
  }

  public destroy() {
    try {
      this.server?.close();
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }
    } catch {}
  }
}
