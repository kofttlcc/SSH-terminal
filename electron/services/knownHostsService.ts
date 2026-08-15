import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { KnownHostItem } from '../../src/types';

/**
 * OpenSSH "Drunken Bishop" Visual Randomart Generator
 */
export function generateRandomart(digestBuffer: Buffer, title: string = 'ED25519 256'): string {
  const SIZEX = 17;
  const SIZEY = 9;
  const symbols = ' .o+=*BOX@%&#/^SE';
  const field: number[][] = Array.from({ length: SIZEY }, () => Array(SIZEX).fill(0));

  let x = Math.floor(SIZEX / 2);
  let y = Math.floor(SIZEY / 2);

  // Walk the digest
  for (let i = 0; i < digestBuffer.length; i++) {
    let byte = digestBuffer[i];
    for (let b = 0; b < 4; b++) {
      const dx = (byte & 0x1) !== 0 ? 1 : -1;
      const dy = (byte & 0x2) !== 0 ? 1 : -1;
      byte >>= 2;

      x = Math.max(0, Math.min(SIZEX - 1, x + dx));
      y = Math.max(0, Math.min(SIZEY - 1, y + dy));

      if (field[y][x] < symbols.length - 3) {
        field[y][x]++;
      }
    }
  }

  // Mark start and end
  field[Math.floor(SIZEY / 2)][Math.floor(SIZEX / 2)] = symbols.length - 2; // 'S'
  field[y][x] = symbols.length - 1; // 'E'

  // Format into border box
  const lines: string[] = [];
  const header = `+--[${title}]`;
  lines.push(header + '-'.repeat(Math.max(0, SIZEX + 2 - header.length)) + '+');

  for (let row = 0; row < SIZEY; row++) {
    let line = '|';
    for (let col = 0; col < SIZEX; col++) {
      line += symbols[field[row][col]];
    }
    line += '|';
    lines.push(line);
  }

  lines.push('+' + '-'.repeat(SIZEX) + '+');
  return lines.join('\n');
}

export class KnownHostsService {
  private filePath: string;
  private knownHosts: Map<string, KnownHostItem> = new Map();

  constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.filePath = path.join(userDataPath, 'known_hosts.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data: KnownHostItem[] = JSON.parse(raw);
        this.knownHosts.clear();
        for (const item of data) {
          const key = `${item.hostname}:${item.port}`;
          this.knownHosts.set(key, item);
        }
      }
    } catch {
      this.knownHosts.clear();
    }
  }

  private save() {
    try {
      const list = Array.from(this.knownHosts.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save known_hosts:', e);
    }
  }

  public getKnownHosts(): KnownHostItem[] {
    return Array.from(this.knownHosts.values()).sort((a, b) => b.addedAt - a.addedAt);
  }

  public removeKnownHost(id: string): boolean {
    let deleted = false;
    for (const [key, item] of this.knownHosts.entries()) {
      if (item.id === id) {
        this.knownHosts.delete(key);
        deleted = true;
        break;
      }
    }
    if (deleted) this.save();
    return deleted;
  }

  public verifyKey(
    hostname: string,
    port: number,
    keyType: string,
    keyBuffer: Buffer
  ): {
    status: 'trusted' | 'unknown' | 'mismatch';
    fingerprint: string;
    visualArt: string;
    expectedFingerprint?: string;
  } {
    // Generate SHA-256 Digest
    const sha256Hash = crypto.createHash('sha256').update(keyBuffer).digest();
    const fingerprint = `SHA256:${sha256Hash.toString('base64').replace(/=+$/, '')}`;
    const visualArt = generateRandomart(sha256Hash, `${keyType.toUpperCase()} 256`);

    const lookupKey = `${hostname}:${port}`;
    const existing = this.knownHosts.get(lookupKey);

    if (!existing) {
      return {
        status: 'unknown',
        fingerprint,
        visualArt
      };
    }

    if (existing.fingerprint === fingerprint) {
      existing.lastSeenAt = Date.now();
      this.save();
      return {
        status: 'trusted',
        fingerprint,
        visualArt
      };
    }

    // Fingerprint Mismatch -> Potential MITM Attack!
    return {
      status: 'mismatch',
      fingerprint,
      visualArt,
      expectedFingerprint: existing.fingerprint
    };
  }

  public addKnownHost(
    hostname: string,
    port: number,
    keyType: string,
    fingerprint: string,
    visualArt?: string
  ): KnownHostItem {
    const lookupKey = `${hostname}:${port}`;
    const item: KnownHostItem = {
      id: 'kh-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      hostname,
      port,
      keyType,
      fingerprint,
      visualArt,
      addedAt: Date.now(),
      lastSeenAt: Date.now(),
      trusted: true
    };

    this.knownHosts.set(lookupKey, item);
    this.save();
    return item;
  }
}
