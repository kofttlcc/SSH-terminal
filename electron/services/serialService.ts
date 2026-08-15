import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { BrowserWindow } from 'electron';
import { SerialPortInfo } from '../../src/types';

export interface SerialSession {
  sessionId: string;
  portPath: string;
  baudRate: number;
  fd: number;
  readStream: fs.ReadStream;
  writeStream: fs.WriteStream;
  win: BrowserWindow;
}

export interface SerialConfig {
  portPath: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
  flowControl?: 'none' | 'rtscts' | 'xonxoff';
}

export class SerialService {
  private sessions: Map<string, SerialSession> = new Map();

  /**
   * Scans and returns all available serial / USB-to-UART ports on macOS, Windows, and Linux
   */
  public async listPorts(): Promise<SerialPortInfo[]> {
    const ports: SerialPortInfo[] = [];
    const seenPaths = new Set<string>();

    try {
      if (process.platform === 'win32') {
        // Windows Serial Port Enumeration (via PowerShell WMI / CIM & SerialPort class)
        try {
          const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity -Filter \\"Caption like '%(COM%'\\" | Select-Object -Property Caption, DeviceID, Manufacturer | ConvertTo-Json -Compress"`;
          const stdout = execSync(psCommand, { encoding: 'utf-8', timeout: 3000 }).trim();
          
          if (stdout) {
            let data = JSON.parse(stdout);
            if (!Array.isArray(data)) data = [data];

            for (const item of data) {
              const caption = item.Caption || '';
              const match = caption.match(/\((COM\d+)\)/i);
              if (match) {
                const comPort = match[1].toUpperCase();
                if (!seenPaths.has(comPort)) {
                  seenPaths.add(comPort);
                  ports.push({
                    path: comPort,
                    name: caption,
                    manufacturer: item.Manufacturer || 'USB Serial Device'
                  });
                }
              }
            }
          }
        } catch {
          // Fallback: Query .NET SerialPort.GetPortNames() directly
          try {
            const fallbackCmd = `powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames() | ConvertTo-Json -Compress"`;
            const fbOut = execSync(fallbackCmd, { encoding: 'utf-8', timeout: 2000 }).trim();
            if (fbOut) {
              let coms = JSON.parse(fbOut);
              if (!Array.isArray(coms)) coms = [coms];
              for (const c of coms) {
                const comStr = String(c).toUpperCase();
                if (comStr.startsWith('COM') && !seenPaths.has(comStr)) {
                  seenPaths.add(comStr);
                  ports.push({
                    path: comStr,
                    name: `序列埠 ${comStr}`,
                    manufacturer: 'Windows COM Port'
                  });
                }
              }
            }
          } catch {}
        }
      } else if (process.platform === 'darwin') {
        // macOS Call-Out devices
        const devFiles = fs.readdirSync('/dev');
        const cuDevices = devFiles.filter((f) => f.startsWith('cu.'));

        for (const cu of cuDevices) {
          const fullPath = `/dev/${cu}`;
          if (seenPaths.has(fullPath)) continue;

          // 嚴格過濾實體 USB 轉串口 / UART 晶片設備
          const isUsbSerial = /usbserial|wchusbserial|slab_usb|usbmodem|pl2303|ftdi|ch34|cp21/i.test(cu);
          if (!isUsbSerial) {
            continue;
          }

          seenPaths.add(fullPath);

          let name = cu;
          let manufacturer = 'USB-to-Serial Console Cable';

          if (cu.includes('usbserial')) {
            name = `USB 序列埠控制台 (${cu.replace('cu.', '')})`;
          } else if (cu.includes('wchusbserial')) {
            name = `CH340/CH341 序列埠轉接器 (${cu.replace('cu.', '')})`;
          } else if (cu.includes('SLAB_USBtoUART')) {
            name = `CP2102/CP210x 序列埠轉接器 (${cu.replace('cu.', '')})`;
          } else if (cu.includes('usbmodem')) {
            name = `USB Modem / CDC 序列埠 (${cu.replace('cu.', '')})`;
          } else if (cu.includes('PL2303')) {
            name = `PL2303 序列埠轉接器 (${cu.replace('cu.', '')})`;
          }

          ports.push({
            path: fullPath,
            name,
            manufacturer
          });
        }
      } else if (process.platform === 'linux') {
        const devFiles = fs.readdirSync('/dev');
        const ttyDevices = devFiles.filter((f) => f.startsWith('ttyUSB') || f.startsWith('ttyACM'));
        for (const tty of ttyDevices) {
          const fullPath = `/dev/${tty}`;
          ports.push({
            path: fullPath,
            name: `USB 序列埠 ${tty}`,
            manufacturer: 'Linux USB TTY'
          });
        }
      }
    } catch (err) {
      console.error('Failed to list serial ports:', err);
    }

    // Sort USB serial adapters to the top
    ports.sort((a, b) => {
      const aIsUsb = a.path.includes('usbserial') || a.path.includes('wch') || a.path.includes('SLAB') || a.path.includes('ACM') || a.path.startsWith('COM');
      const bIsUsb = b.path.includes('usbserial') || b.path.includes('wch') || b.path.includes('SLAB') || b.path.includes('ACM') || b.path.startsWith('COM');
      if (aIsUsb && !bIsUsb) return -1;
      if (!aIsUsb && bIsUsb) return 1;
      return a.path.localeCompare(b.path);
    });

    return ports;
  }

  /**
   * Configures and creates an interactive bidirectional Serial session
   */
  public async createSession(
    sessionId: string,
    win: BrowserWindow,
    config: SerialConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { portPath, baudRate = 9600, dataBits = 8, stopBits = 1, parity = 'none', flowControl = 'none' } = config;

      let targetDevicePath = portPath;

      // 1. Windows Configuration & Path Normalization
      if (process.platform === 'win32') {
        const cleanCom = portPath.replace(/^\\\\\\.\\\\/i, '').toUpperCase();
        targetDevicePath = `\\\\.\\${cleanCom}`;

        // Configure COM port parameters via Windows MODE command
        try {
          const pChar = parity === 'even' ? 'E' : parity === 'odd' ? 'O' : parity === 'mark' ? 'M' : parity === 'space' ? 'S' : 'N';
          execSync(`mode ${cleanCom} BAUD=${baudRate} PARITY=${pChar} DATA=${dataBits} STOP=${stopBits}`, {
            timeout: 2000,
            windowsHide: true
          });
        } catch (modeErr: any) {
          console.warn('Windows MODE port configuration note:', modeErr.message);
        }
      } else {
        // macOS / Linux Path Check
        if (!fs.existsSync(portPath)) {
          return { success: false, error: `串口設備不存在或已被移除: ${portPath}` };
        }

        // Configure stty parameters on macOS/Linux
        const sttyFlag = process.platform === 'darwin' ? '-f' : '-F';
        const csFlag = `cs${dataBits}`;
        const stopFlag = stopBits === 2 ? 'cstopb' : '-cstopb';
        let parFlag = '-parenb';
        if (parity === 'even') parFlag = 'parenb -parodd';
        else if (parity === 'odd') parFlag = 'parenb parodd';

        let flowFlag = '-crtscts';
        if (flowControl === 'rtscts') flowFlag = 'crtscts';
        else if (flowControl === 'xonxoff') flowFlag = 'ixon ixoff';

        try {
          execSync(`stty ${sttyFlag} ${portPath} ${baudRate} ${csFlag} ${stopFlag} ${parFlag} ${flowFlag} raw -echo`, {
            timeout: 2000
          });
        } catch (sttyErr: any) {
          console.warn('stty configuration notice:', sttyErr.message);
        }
      }

      // 2. Open non-blocking Read/Write File Descriptor
      const openFlags = process.platform === 'win32'
        ? (fs.constants.O_RDWR)
        : (fs.constants.O_RDWR | fs.constants.O_NOCTTY | fs.constants.O_NONBLOCK);

      const fd = fs.openSync(targetDevicePath, openFlags);

      const readStream = fs.createReadStream(null as any, { fd, autoClose: false });
      const writeStream = fs.createWriteStream(null as any, { fd, autoClose: false });

      readStream.on('data', (chunk: Buffer | string) => {
        if (!win.isDestroyed()) {
          const str = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
          win.webContents.send('terminal:data', {
            sessionId,
            data: str
          });
        }
      });

      readStream.on('error', (err: any) => {
        console.error(`Serial read error on ${targetDevicePath}:`, err);
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:data', {
            sessionId,
            data: `\r\n\x1b[31m[串口讀取錯誤: ${err.message}]\x1b[0m\r\n`
          });
        }
      });

      readStream.on('end', () => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:closed', { sessionId });
        }
        this.closeSession(sessionId);
      });

      this.sessions.set(sessionId, {
        sessionId,
        portPath: targetDevicePath,
        baudRate,
        fd,
        readStream,
        writeStream,
        win
      });

      return { success: true };
    } catch (err: any) {
      console.error('Failed to create serial session:', err);
      return { success: false, error: err.message || '無法開啟序列埠設備' };
    }
  }

  /**
   * Writes data from xterm.js into the serial device stream
   */
  public write(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.writeStream.writable) {
        session.writeStream.write(Buffer.from(data, 'utf-8'));
      } else {
        // Fallback direct synchronous write to fd
        const buf = Buffer.from(data, 'utf-8');
        fs.writeSync(session.fd, buf, 0, buf.length, null);
      }
    } catch (err) {
      console.error('Serial write error:', err);
    }
  }

  /**
   * Closes the serial session and releases the hardware lock
   */
  public closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.readStream.destroy();
      } catch {}
      try {
        session.writeStream.destroy();
      } catch {}
      try {
        fs.closeSync(session.fd);
      } catch {}
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Closes all active serial sessions
   */
  public closeAll() {
    for (const [sessionId] of this.sessions) {
      this.closeSession(sessionId);
    }
  }
}
