import Foundation
import Darwin

public class LocalPtySession {
    public let sessionId: String
    private var masterFd: Int32 = -1
    private var process: Process?
    private var readSource: DispatchSourceRead?
    public var onDataReceived: ((Data) -> Void)?
    public var onTerminated: ((Int32) -> Void)?

    public init(sessionId: String) {
        self.sessionId = sessionId
    }

    public func start(shellPath: String = "/bin/zsh", rows: UInt16 = 24, cols: UInt16 = 80) -> Bool {
        var master: Int32 = 0
        var slave: Int32 = 0
        var win = winsize(ws_row: rows, ws_col: cols, ws_xpixel: 0, ws_ypixel: 0)

        guard openpty(&master, &slave, nil, nil, &win) == 0 else {
            print("Failed to openpty")
            return false
        }

        self.masterFd = master

        let slaveHandle = FileHandle(fileDescriptor: slave, closeOnDealloc: true)

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: shellPath)
        proc.arguments = ["-l"]
        proc.currentDirectoryURL = URL(fileURLWithPath: NSHomeDirectory())

        var env = ProcessInfo.processInfo.environment
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["LANG"] = "en_US.UTF-8"
        env["LC_ALL"] = "en_US.UTF-8"
        proc.environment = env

        proc.standardInput = slaveHandle
        proc.standardOutput = slaveHandle
        proc.standardError = slaveHandle

        proc.terminationHandler = { [weak self] p in
            DispatchQueue.main.async {
                self?.onTerminated?(p.terminationStatus)
            }
        }

        do {
            try proc.run()
            self.process = proc
        } catch {
            close(master)
            return false
        }

        // Set master non-blocking
        let flags = fcntl(master, F_GETFL)
        _ = fcntl(master, F_SETFL, flags | O_NONBLOCK)

        // Setup async dispatch read
        let queue = DispatchQueue(label: "itgeek.pty.read.\(sessionId)")
        let source = DispatchSource.makeReadSource(fileDescriptor: master, queue: queue)

        source.setEventHandler { [weak self] in
            guard let self = self, self.masterFd >= 0 else { return }
            var buffer = [UInt8](repeating: 0, count: 4096)
            let bytesRead = Darwin.read(self.masterFd, &buffer, buffer.count)
            if bytesRead > 0 {
                let data = Data(buffer[0..<bytesRead])
                DispatchQueue.main.async {
                    self.onDataReceived?(data)
                }
            } else if bytesRead == 0 {
                source.cancel()
            }
        }

        source.setCancelHandler { [weak self] in
            guard let self = self else { return }
            if self.masterFd >= 0 {
                close(self.masterFd)
                self.masterFd = -1
            }
        }

        source.resume()
        self.readSource = source
        return true
    }

    public func writeData(_ data: Data) {
        guard masterFd >= 0 else { return }
        data.withUnsafeBytes { rawBuffer in
            guard let baseAddress = rawBuffer.baseAddress else { return }
            _ = Darwin.write(masterFd, baseAddress, rawBuffer.count)
        }
    }

    public func resize(rows: UInt16, cols: UInt16) {
        guard masterFd >= 0 else { return }
        var win = winsize(ws_row: rows, ws_col: cols, ws_xpixel: 0, ws_ypixel: 0)
        _ = ioctl(masterFd, TIOCSWINSZ, &win)
        if let proc = process, proc.isRunning {
            kill(proc.processIdentifier, SIGWINCH)
        }
    }

    public func terminate() {
        readSource?.cancel()
        readSource = nil
        if let proc = process, proc.isRunning {
            proc.terminate()
            process = nil
        }
    }
}
