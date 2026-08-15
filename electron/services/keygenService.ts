import crypto from 'crypto';
import ssh2 from 'ssh2';
import { SSHKeyItem } from '../../src/types';

function encodeOpenSSHString(buf: Buffer | string): Buffer {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

function encodeOpenSSHEd25519(publicKeyRaw: Buffer, privateKeyRaw: Buffer, comment: string = ''): string {
  const checkint = crypto.randomBytes(4);

  const pubWire = Buffer.concat([
    encodeOpenSSHString('ssh-ed25519'),
    encodeOpenSSHString(publicKeyRaw)
  ]);

  const fullPriv = Buffer.concat([privateKeyRaw, publicKeyRaw]);

  let privBlock = Buffer.concat([
    checkint,
    checkint,
    encodeOpenSSHString('ssh-ed25519'),
    encodeOpenSSHString(publicKeyRaw),
    encodeOpenSSHString(fullPriv),
    encodeOpenSSHString(comment)
  ]);

  // Padding to multiple of 8
  const padLen = (8 - (privBlock.length % 8)) % 8;
  const padding = Buffer.alloc(padLen);
  for (let i = 0; i < padLen; i++) padding[i] = i + 1;
  privBlock = Buffer.concat([privBlock, padding]);

  const magic = Buffer.from('openssh-key-v1\0', 'binary');
  const header = Buffer.concat([
    magic,
    encodeOpenSSHString('none'), // cipherName
    encodeOpenSSHString('none'), // kdfName
    encodeOpenSSHString(Buffer.alloc(0)), // kdfOpts
    Buffer.from([0, 0, 0, 1]), // number of keys
    encodeOpenSSHString(pubWire),
    encodeOpenSSHString(privBlock)
  ]);

  const base64 = header.toString('base64');
  const lines = base64.match(/.{1,70}/g)?.join('\n') || base64;
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${lines}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

export class KeygenService {
  /**
   * Normalizes any private key (PKCS#8, PKCS#1, OpenSSH, PuTTY, raw) into standard format ssh2 accepts
   */
  public static normalizePrivateKey(rawKey?: string, passphrase?: string): string | undefined {
    if (!rawKey || typeof rawKey !== 'string') return undefined;
    const keyStr = rawKey.trim();

    // 1. Check if ssh2 parses it directly
    const parsed = ssh2.utils.parseKey(keyStr, passphrase);
    if (!(parsed instanceof Error)) {
      return keyStr;
    }

    // 2. Try parsing with Node.js crypto module and converting to OpenSSH / PKCS#1
    try {
      const keyObj = crypto.createPrivateKey({
        key: keyStr,
        format: 'pem',
        passphrase
      });

      if (keyObj.asymmetricKeyType === 'ed25519') {
        const derPub = crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'der' });
        const derPriv = keyObj.export({ type: 'pkcs8', format: 'der' });
        const rawPub = derPub.subarray(-32);
        const rawPriv = derPriv.subarray(-32);
        return encodeOpenSSHEd25519(rawPub, rawPriv);
      } else if (keyObj.asymmetricKeyType === 'rsa') {
        return keyObj.export({ type: 'pkcs1', format: 'pem' }) as string;
      }
    } catch {
      // Fallback to original
    }

    return keyStr;
  }

  public static generateKeyPair(name: string, type: 'ed25519' | 'rsa' = 'ed25519', passphrase?: string): SSHKeyItem {
    if (type === 'ed25519') {
      const key = crypto.generateKeyPairSync('ed25519');
      const derPub = key.publicKey.export({ type: 'spki', format: 'der' });
      const derPriv = key.privateKey.export({ type: 'pkcs8', format: 'der' });
      const rawPub = derPub.subarray(-32);
      const rawPriv = derPriv.subarray(-32);

      const pubWire = Buffer.concat([
        encodeOpenSSHString('ssh-ed25519'),
        encodeOpenSSHString(rawPub)
      ]);
      const publicKey = `ssh-ed25519 ${pubWire.toString('base64')} ${name}`;
      const fingerprint = `SHA256:${crypto.createHash('sha256').update(pubWire).digest('base64').replace(/=+$/, '')}`;
      const privateKey = encodeOpenSSHEd25519(rawPub, rawPriv, name);

      return {
        id: 'key-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name,
        type: 'ed25519',
        publicKey,
        privateKey,
        passphrase,
        fingerprint,
        createdAt: Date.now()
      };
    } else {
      const key = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'pkcs1',
          format: 'pem'
        },
        privateKeyEncoding: passphrase
          ? {
              type: 'pkcs1',
              format: 'pem',
              cipher: 'aes-256-cbc',
              passphrase
            }
          : {
              type: 'pkcs1',
              format: 'pem'
            }
      });

      const parsed = ssh2.utils.parseKey(key.privateKey, passphrase);
      let publicKey = '';
      let fingerprint = '';

      if (!(parsed instanceof Error) && typeof (parsed as any).getPublicSSH === 'function') {
        const pubSSH = (parsed as any).getPublicSSH();
        publicKey = `ssh-rsa ${pubSSH.toString('base64')} ${name}`;
        fingerprint = `SHA256:${crypto.createHash('sha256').update(pubSSH).digest('base64').replace(/=+$/, '')}`;
      } else {
        publicKey = key.publicKey;
        fingerprint = `SHA256:${crypto.createHash('sha256').update(key.publicKey).digest('base64').replace(/=+$/, '')}`;
      }

      return {
        id: 'key-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name,
        type: 'rsa',
        publicKey,
        privateKey: key.privateKey,
        passphrase,
        fingerprint,
        createdAt: Date.now()
      };
    }
  }
}
