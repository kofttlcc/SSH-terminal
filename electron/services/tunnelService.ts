import net from 'net';
import { Client, ConnectConfig } from 'ssh2';
import { TunnelRule, HostItem } from '../../src/types';

export interface ActiveTunnel {
  ruleId: string;
  server?: net.Server;
  sshClient: Client;
  status: 'active' | 'error';
  errorMessage?: string;
}

export class TunnelService {
  private activeTunnels: Map<string, ActiveTunnel> = new Map();

  public async startTunnel(
    rule: TunnelRule,
    host: HostItem
  ): Promise<{ success: boolean; error?: string }> {
    if (this.activeTunnels.has(rule.id)) {
      return { success: true };
    }

    return new Promise((resolve) => {
      try {
        const sshClient = new Client();
        const config: ConnectConfig = {
          host: host.hostname,
          port: host.port || 22,
          username: host.username,
          readyTimeout: 20000
        };

        if (host.authType === 'password' && host.password) {
          config.password = host.password;
        } else if (host.authType === 'privateKey' && host.privateKey) {
          config.privateKey = host.privateKey;
          if (host.passphrase) {
            config.passphrase = host.passphrase;
          }
        }

        sshClient.on('ready', () => {
          if (rule.type === 'local') {
            // Local port forwarding (e.g. 127.0.0.1:3306 -> remote:3306)
            const server = net.createServer((socket) => {
              sshClient.forwardOut(
                '127.0.0.1',
                socket.remotePort || 0,
                rule.remoteHost,
                rule.remotePort,
                (err, stream) => {
                  if (err) {
                    socket.end();
                    return;
                  }
                  socket.pipe(stream);
                  stream.pipe(socket);
                  socket.on('error', () => stream.end());
                  stream.on('error', () => socket.end());
                }
              );
            });

            server.listen(rule.localPort, rule.localHost || '127.0.0.1', () => {
              this.activeTunnels.set(rule.id, {
                ruleId: rule.id,
                server,
                sshClient,
                status: 'active'
              });
              resolve({ success: true });
            });

            server.on('error', (err) => {
              sshClient.end();
              resolve({ success: false, error: `Local port bind failed: ${err.message}` });
            });
          } else if (rule.type === 'dynamic') {
            // SOCKS5 Dynamic Proxy
            const server = net.createServer((socket) => {
              this.handleSocks5Connection(socket, sshClient);
            });

            server.listen(rule.localPort, rule.localHost || '127.0.0.1', () => {
              this.activeTunnels.set(rule.id, {
                ruleId: rule.id,
                server,
                sshClient,
                status: 'active'
              });
              resolve({ success: true });
            });

            server.on('error', (err) => {
              sshClient.end();
              resolve({ success: false, error: `SOCKS5 proxy bind failed: ${err.message}` });
            });
          } else {
            // Remote port forwarding
            sshClient.forwardIn(rule.remoteHost, rule.remotePort, (err) => {
              if (err) {
                sshClient.end();
                resolve({ success: false, error: err.message });
                return;
              }

              sshClient.on('tcp connection', (info, accept) => {
                const localSocket = net.connect(rule.localPort, rule.localHost || '127.0.0.1');
                const stream = accept();
                localSocket.pipe(stream);
                stream.pipe(localSocket);
                localSocket.on('error', () => stream.end());
                stream.on('error', () => localSocket.end());
              });

              this.activeTunnels.set(rule.id, {
                ruleId: rule.id,
                sshClient,
                status: 'active'
              });
              resolve({ success: true });
            });
          }
        });

        sshClient.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        sshClient.connect(config);
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  private handleSocks5Connection(socket: net.Socket, sshClient: Client) {
    let state = 0; // 0: greeting, 1: request

    socket.on('data', (chunk) => {
      if (state === 0) {
        // SOCKS5 handshake (RFC 1928)
        if (chunk[0] !== 0x05) {
          socket.end();
          return;
        }
        // Respond with NO AUTHENTICATION REQUIRED (0x05, 0x00)
        socket.write(Buffer.from([0x05, 0x00]));
        state = 1;
      } else if (state === 1) {
        // SOCKS5 request
        const cmd = chunk[1];
        if (cmd !== 0x01) { // CONNECT command only
          socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0])); // Command not supported
          socket.end();
          return;
        }

        const atyp = chunk[3];
        let targetHost = '';
        let targetPort = 0;
        let offset = 4;

        if (atyp === 0x01) {
          // IPv4
          targetHost = `${chunk[offset]}.${chunk[offset+1]}.${chunk[offset+2]}.${chunk[offset+3]}`;
          offset += 4;
        } else if (atyp === 0x03) {
          // Domain name
          const domainLen = chunk[offset];
          offset += 1;
          targetHost = chunk.subarray(offset, offset + domainLen).toString('utf-8');
          offset += domainLen;
        } else if (atyp === 0x04) {
          // IPv6
          targetHost = chunk.subarray(offset, offset + 16).toString('hex');
          offset += 16;
        }

        targetPort = chunk.readUInt16BE(offset);

        // Forward via SSH
        sshClient.forwardOut(
          '127.0.0.1',
          socket.remotePort || 0,
          targetHost,
          targetPort,
          (err, stream) => {
            if (err) {
              socket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0])); // General failure
              socket.end();
              return;
            }

            // Success response
            socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
            socket.pipe(stream);
            stream.pipe(socket);
            socket.on('error', () => stream.end());
            stream.on('error', () => socket.end());
          }
        );
      }
    });
  }

  public stopTunnel(ruleId: string) {
    const active = this.activeTunnels.get(ruleId);
    if (active) {
      try {
        if (active.server) {
          active.server.close();
        }
        active.sshClient.end();
      } catch {
        // ignore
      }
      this.activeTunnels.delete(ruleId);
    }
  }

  public stopAll() {
    for (const [id] of this.activeTunnels) {
      this.stopTunnel(id);
    }
  }
}
