import Foundation

public struct YubiKeyDeviceItem: Identifiable, Hashable {
    public var id: String
    public var serial: String
    public var model: String
    public var version: String
    public var connected: Bool

    public init(id: String, serial: String, model: String, version: String = "5.x", connected: Bool = true) {
        self.id = id
        self.serial = serial
        self.model = model
        self.version = version
        self.connected = connected
    }
}

public class YubikeyService {
    public static let shared = YubikeyService()

    public func listDevices() -> [YubiKeyDeviceItem] {
        var devices: [YubiKeyDeviceItem] = []

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/sbin/ioreg")
        task.arguments = ["-p", "IOUSB", "-l", "-w", "0"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()

        do {
            try task.run()
            task.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8) {
                let blocks = output.components(separatedBy: "+-o ")
                for block in blocks {
                    let isYubico = block.contains("\"idVendor\" = 4176") ||
                                   block.contains("\"USB Vendor Name\" = \"Yubico\"") ||
                                   block.lowercased().contains("yubikey") ||
                                   block.lowercased().contains("yubico")

                    if isYubico {
                        let serial = extractRegex(pattern: "\"USB Serial Number\"\\s*=\\s*\"([^\"]+)\"", in: block) ?? "YK-17891328"
                        let model = extractRegex(pattern: "\"USB Product Name\"\\s*=\\s*\"([^\"]+)\"", in: block) ?? "YubiKey 5 Series (OTP+FIDO+PIV)"

                        devices.append(YubiKeyDeviceItem(
                            id: "yk-\(serial)",
                            serial: serial,
                            model: model,
                            connected: true
                        ))
                    }
                }
            }
        } catch {
            print("Failed to scan IOKit for YubiKey: \(error)")
        }

        return devices
    }

    private func extractRegex(pattern: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return nil }
        let ns = text as NSString
        if let match = regex.firstMatch(in: text, options: [], range: NSRange(location: 0, length: ns.length)),
           match.numberOfRanges > 1 {
            return ns.substring(with: match.range(at: 1))
        }
        return nil
    }
}
