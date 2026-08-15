import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import os from 'os';
import { BrowserWindow } from 'electron';

export interface LocalPtySession {
  sessionId: string;
  process: ChildProcessWithoutNullStreams;
}

export class LocalPtyService {
  private sessions: Map<string, LocalPtySession> = new Map();

  public createSession(sessionId: string, win: BrowserWindow, customShell?: string, cwd?: string) {
    const isWin = process.platform === 'win32';
    const shell = customShell || (isWin ? (process.env.ComSpec || 'powershell.exe') : (process.env.SHELL || '/bin/zsh'));
    const homeDir = cwd || os.homedir();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      PS1: '%n@%m:%~%# '
    };

    // Interactive login flags for unix shells vs Windows PowerShell
    const args = isWin 
      ? (shell.toLowerCase().includes('powershell') ? ['-NoLogo'] : []) 
      : ['-l', '-i'];

    const p = spawn(shell, args, {
      cwd: homeDir,
      env,
      shell: false
    });

    this.sessions.set(sessionId, { sessionId, process: p });

    p.stdout.on('data', (data: Buffer) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', { sessionId, data: data.toString('utf-8') });
      }
    });

    p.stderr.on('data', (data: Buffer) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', { sessionId, data: data.toString('utf-8') });
      }
    });

    p.on('close', (code) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:closed', { sessionId, code });
      }
      this.sessions.delete(sessionId);
    });

    p.on('error', (err) => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:error', { sessionId, error: err.message });
      }
    });

    return { sessionId, success: true };
  }

  public write(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.process && !session.process.killed) {
      if (process.platform === 'win32') {
        session.process.stdin.write(data);
      } else {
        // In pipe mode on unix, convert carriage returns to newlines for command execution
        const cleanData = data.replace(/\r/g, '\n');
        session.process.stdin.write(cleanData);
      }
    }
  }

  public resize(sessionId: string, cols: number, rows: number) {
    const session = this.sessions.get(sessionId);
    if (session && session.process && !session.process.killed) {
      if (process.platform !== 'win32') {
        try {
          session.process.stdin.write(`stty cols ${cols} rows ${rows} 2>/dev/null;\n`);
        } catch {}
      }
    }
  }

  public close(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.process.kill();
      } catch {}
      this.sessions.delete(sessionId);
    }
  }

  public closeAll() {
    for (const [id] of this.sessions) {
      this.close(id);
    }
  }
}
