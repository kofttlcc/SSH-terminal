import Foundation
import Darwin

public class SSHSession {
    public let sessionId: String
    public let host: HostItem
    private var masterFd: Int32 = -1
    private var process: Process?
    private var readSource: DispatchSourceRead?
    private var tempKeyFilePath: String?
    private var hasAutoFilledPassword: Bool = false
    public var onDataReceived: ((Data) -> Void)?
    public var onClosed: (() -> Void)?
    public var onError: ((String) -> Void)?

    public init(sessionId: String, host: HostItem) {
        self.sessionId = sessionId
        self.host = host
    }

    public func connect(rows: UInt16 = 24, cols: UInt16 = 80) -> Bool {
        var master: Int32 = 0
        var slave: Int32 = 0
        var win = winsize(ws_row: rows, ws_col: cols, ws_xpixel: 0, ws_ypixel: 0)

        guard openpty(&master, &slave, nil, nil, &win) == 0 else {
            self.onError?("無法分配虛擬終端 (openpty failed)")
            return false
        }

        self.masterFd = master

        let slaveHandle = FileHandle(fileDescriptor: slave, closeOnDealloc: true)

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/ssh")

        var sshArgs = [
            "-tt",
            "-o", "RequestTTY=force",
            "-p", "\(host.port)",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=4",
            "-o", "TCPKeepAlive=yes",
            "-o", "ConnectTimeout=10",
            "-o", "ExitOnForwardFailure=no"
        ]

        if host.agentForward == true {
            sshArgs.append(contentsOf: ["-A", "-o", "ForwardAgent=yes"])
        }

        // Handle Jump Host
        if let jumpHostId = host.jumpHostId, !jumpHostId.isEmpty {
            let vault = VaultStorageService.shared.loadVault()
            if let jump = vault.hosts.first(where: { $0.id == jumpHostId }) {
                sshArgs.append(contentsOf: ["-J", "\(jump.username)@\(jump.hostname):\(jump.port)"])
            } else {
                sshArgs.append(contentsOf: ["-J", jumpHostId])
            }
        }

        // Handle SSH Key / YubiKey Identity
        let keyPath = resolveIdentityKey()
        if let kp = keyPath {
            sshArgs.append(contentsOf: ["-i", kp])
            self.tempKeyFilePath = kp
        } else if host.authType == .yubikey {
            let pkcs11Paths = [
                "/opt/homebrew/lib/libykcs11.dylib",
                "/usr/local/lib/libykcs11.dylib",
                "/Library/OpenSC/lib/opensc-pkcs11.so"
            ]
            for p in pkcs11Paths {
                if FileManager.default.fileExists(atPath: p) {
                    sshArgs.append(contentsOf: ["-o", "PKCS11Provider=\(p)"])
                    break
                }
            }
        }

        let destination = "\(host.username)@\(host.hostname)"
        sshArgs.append(destination)

        proc.arguments = sshArgs

        var env = ProcessInfo.processInfo.environment
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["LANG"] = "en_US.UTF-8"
        env["LC_ALL"] = "en_US.UTF-8"
        proc.environment = env

        proc.standardInput = slaveHandle
        proc.standardOutput = slaveHandle
        proc.standardError = slaveHandle

        proc.terminationHandler = { [weak self] _ in
            self?.cleanupTempKey()
            DispatchQueue.main.async {
                self?.onClosed?()
            }
        }

        do {
            try proc.run()
            self.process = proc
        } catch {
            close(master)
            cleanupTempKey()
            self.onError?("啟動 SSH 進程失敗: \(error.localizedDescription)")
            return false
        }

        let flags = fcntl(master, F_GETFL)
        _ = fcntl(master, F_SETFL, flags | O_NONBLOCK)

        let queue = DispatchQueue(label: "itgeek.ssh.read.\(sessionId)")
        let source = DispatchSource.makeReadSource(fileDescriptor: master, queue: queue)

        source.setEventHandler { [weak self] in
            guard let self = self, self.masterFd >= 0 else { return }
            var buffer = [UInt8](repeating: 0, count: 4096)
            let bytesRead = Darwin.read(self.masterFd, &buffer, buffer.count)
            if bytesRead > 0 {
                let data = Data(buffer[0..<bytesRead])
                let text = String(decoding: data, as: UTF8.self)

                // Auto-fill password if host has password and server is asking for password
                if let pwd = self.host.password, !pwd.isEmpty, !self.hasAutoFilledPassword {
                    let lower = text.lowercased()
                    if lower.contains("password:") || lower.contains("passphrase for key") || lower.contains("password for") {
                        self.hasAutoFilledPassword = true
                        DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) { [weak self] in
                            if let pwdData = (pwd + "\n").data(using: .utf8) {
                                self?.writeData(pwdData)
                            }
                        }
                    }
                }

                DispatchQueue.main.async {
                    self.onDataReceived?(data)
                }
            } else if bytesRead == 0 {
                source.cancel()
                self.cleanupTempKey()
                DispatchQueue.main.async {
                    self.onClosed?()
                }
            }
        }

        source.setCancelHandler { [weak self] in
            guard let self = self else { return }
            if self.masterFd >= 0 {
                close(self.masterFd)
                self.masterFd = -1
            }
            self.cleanupTempKey()
        }

        source.resume()
        self.readSource = source
        return true
    }

    private func resolveIdentityKey() -> String? {
        var rawKeyString: String? = host.privateKey
        let targetKeyId = host.keyId ?? host.fallbackKeyId ?? host.yubikeyKeyId

        if (rawKeyString == nil || rawKeyString?.isEmpty == true), let keyId = targetKeyId {
            let vault = VaultStorageService.shared.loadVault()
            if let found = vault.keys.first(where: { $0.id == keyId }) {
                rawKeyString = found.privateKey
            }
        }

        guard let rawKey = rawKeyString, !rawKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }

        var finalPem = extractRawKey(rawKey)
        guard !finalPem.isEmpty else { return nil }

        if !finalPem.hasSuffix("\n") {
            finalPem += "\n"
        }

        let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("itgeek_keys", isDirectory: true)
        try? FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)

        let keyFileName = "key_\(sessionId)_\(UUID().uuidString.prefix(8))"
        let keyFileURL = tmpDir.appendingPathComponent(keyFileName)

        do {
            try finalPem.write(to: keyFileURL, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: keyFileURL.path)
            return keyFileURL.path
        } catch {
            print("Failed to write temporary identity key file: \(error)")
            return nil
        }
    }

    private func extractRawKey(_ key: String) -> String {
        if key.contains("-----BEGIN YUBIKEY PIV CONTAINER-----") {
            if let regex = try? NSRegularExpression(pattern: "Payload:\\s*([A-Za-z0-9+/=\\r\\n]+)", options: []) {
                let ns = key as NSString
                if let match = regex.firstMatch(in: key, options: [], range: NSRange(location: 0, length: ns.length)),
                   match.numberOfRanges > 1 {
                    let payloadBase64 = ns.substring(with: match.range(at: 1)).replacingOccurrences(of: "\n", with: "").replacingOccurrences(of: "\r", with: "").trimmingCharacters(in: .whitespaces)
                    if let data = Data(base64Encoded: payloadBase64),
                       let decoded = String(data: data, encoding: .utf8) {
                        return decoded
                    }
                }
            }
        }
        return key
    }

    private func cleanupTempKey() {
        if let path = tempKeyFilePath {
            try? FileManager.default.removeItem(atPath: path)
            tempKeyFilePath = nil
        }
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
    }

    public func closeSession() {
        readSource?.cancel()
        readSource = nil
        cleanupTempKey()
        if let proc = process, proc.isRunning {
            proc.terminate()
            process = nil
        }
    }
}
