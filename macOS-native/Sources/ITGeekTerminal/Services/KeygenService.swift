import Foundation

public class KeygenService {
    public static let shared = KeygenService()

    public func generateKeyPair(
        name: String,
        type: String = "ed25519",
        comment: String = "",
        passphrase: String = ""
    ) throws -> (privateKey: String, publicKey: String, fingerprint: String) {
        let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("itgeek_keygen_\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmpDir) }

        let keyPath = tmpDir.appendingPathComponent("id_\(type)")
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/ssh-keygen")

        var args = ["-t", type, "-N", passphrase, "-f", keyPath.path, "-q"]
        let c = comment.isEmpty ? "\(name)@macOS-TouchID" : comment
        args.append(contentsOf: ["-C", c])

        if type == "rsa" {
            args.append(contentsOf: ["-b", "4096"])
        } else if type == "ecdsa" {
            args.append(contentsOf: ["-b", "256"])
        }

        proc.arguments = args
        try proc.run()
        proc.waitUntilExit()

        guard proc.terminationStatus == 0 else {
            throw NSError(domain: "Keygen", code: Int(proc.terminationStatus), userInfo: [NSLocalizedDescriptionKey: "ssh-keygen 產生密鑰失敗"])
        }

        let privData = try Data(contentsOf: keyPath)
        let pubData = try Data(contentsOf: tmpDir.appendingPathComponent("id_\(type).pub"))

        let privStr = String(decoding: privData, as: UTF8.self)
        let pubStr = String(decoding: pubData, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)

        // Extract SHA256 Fingerprint
        let fpProc = Process()
        fpProc.executableURL = URL(fileURLWithPath: "/usr/bin/ssh-keygen")
        fpProc.arguments = ["-lf", tmpDir.appendingPathComponent("id_\(type).pub").path]
        let pipe = Pipe()
        fpProc.standardOutput = pipe
        try fpProc.run()
        fpProc.waitUntilExit()
        let fpOut = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
        let fpParts = fpOut.split(separator: " ")
        let fingerprint = fpParts.count > 1 ? String(fpParts[1]) : "SHA256:generated"

        return (privStr, pubStr, fingerprint)
    }

    public func extractFingerprint(publicKey: String) -> String {
        let tmpFile = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("tmp_fp_\(UUID().uuidString).pub")
        try? publicKey.write(to: tmpFile, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: tmpFile) }

        let fpProc = Process()
        fpProc.executableURL = URL(fileURLWithPath: "/usr/bin/ssh-keygen")
        fpProc.arguments = ["-lf", tmpFile.path]
        let pipe = Pipe()
        fpProc.standardOutput = pipe
        try? fpProc.run()
        fpProc.waitUntilExit()
        let fpOut = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
        let fpParts = fpOut.split(separator: " ")
        return fpParts.count > 1 ? String(fpParts[1]) : "SHA256:custom_key"
    }
}
