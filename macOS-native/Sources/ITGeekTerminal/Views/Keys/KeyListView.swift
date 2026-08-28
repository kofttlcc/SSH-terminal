import SwiftUI

public struct KeyListView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("SSH 密鑰管理中心 (Keychains)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("支援使用 macOS Touch ID 硬體安全隔離區保護 Ed25519 與 RSA 密鑰對")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }

                Spacer()

                Button(action: {
                    appState.keyModalOpen = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "touchid")
                            .font(.system(size: 13, weight: .bold))
                        Text("使用 Touch ID 重新生成私鑰")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Color.purple)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider()
                .background(Color.gray.opacity(0.2))

            ScrollView {
                VStack(spacing: 12) {
                    if appState.vault.keys.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "key.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(.top, 40)
                            Text("尚未建立任何 SSH 密鑰")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Text("點擊上方「使用 Touch ID 重新生成私鑰」即可一鍵生成現代 Ed25519 指紋保護密鑰。")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                    } else {
                        ForEach(appState.vault.keys) { key in
                            KeyCardView(appState: appState, key: key)
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}

struct KeyCardView: View {
    @ObservedObject var appState: AppState
    let key: SSHKeyItem

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                // Key Type Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(key.touchIdProtected == true ? Color.purple.opacity(0.2) : Color.yellow.opacity(0.15))
                        .frame(width: 36, height: 36)
                    Image(systemName: key.touchIdProtected == true ? "touchid" : "key.fill")
                        .foregroundColor(key.touchIdProtected == true ? .purple : .yellow)
                        .font(.system(size: 16))
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(key.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)

                        Text(key.type.uppercased())
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(.cyan)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.cyan.opacity(0.15))
                            .cornerRadius(4)

                        if key.touchIdProtected == true {
                            HStack(spacing: 3) {
                                Image(systemName: "lock.shield.fill")
                                    .font(.system(size: 9))
                                Text("Touch ID 保護")
                                    .font(.system(size: 9, weight: .bold))
                            }
                            .foregroundColor(.purple)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.purple.opacity(0.15))
                            .cornerRadius(4)
                        }

                        if key.storageType == "yubikey_fido2" || key.storageType == "yubikey_piv" {
                            HStack(spacing: 3) {
                                Image(systemName: "y.circle.fill")
                                    .font(.system(size: 9))
                                Text("YubiKey \(key.yubikeySerial ?? "")")
                                    .font(.system(size: 9, weight: .bold))
                            }
                            .foregroundColor(.green)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.15))
                            .cornerRadius(4)
                        }
                    }

                    if let fp = key.fingerprint {
                        Text(fp)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(.gray)
                    }
                }

                Spacer()

                // Actions
                HStack(spacing: 8) {
                    if !key.publicKey.isEmpty && key.publicKey.hasPrefix("ssh-") {
                        Button(action: {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(key.publicKey, forType: .string)
                            appState.addToast("success", "已複製「\(key.name)」公鑰至剪貼簿")
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "doc.on.doc")
                                Text("複製公鑰")
                            }
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.cyan)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.cyan.opacity(0.12))
                            .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }

                    // Toggle Touch ID Protection Button
                    Button(action: {
                        if let idx = appState.vault.keys.firstIndex(where: { $0.id == key.id }) {
                            let current = appState.vault.keys[idx].touchIdProtected ?? false
                            appState.vault.keys[idx].touchIdProtected = !current
                            appState.saveVault()
                            appState.addToast("info", "已\(current ? "停用" : "啟用")「\(key.name)」的 Touch ID 指紋保護")
                        }
                    }) {
                        Image(systemName: key.touchIdProtected == true ? "touchid" : "lock.open")
                            .foregroundColor(key.touchIdProtected == true ? .purple : .gray)
                            .font(.system(size: 12))
                            .padding(6)
                            .background(Color.gray.opacity(0.15))
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    .help("切換是否啟用 Touch ID 保護")

                    // Delete Button
                    Button(action: {
                        if let idx = appState.vault.keys.firstIndex(where: { $0.id == key.id }) {
                            appState.vault.keys.remove(at: idx)
                            appState.saveVault()
                            appState.addToast("warning", "已刪除密鑰「\(key.name)」")
                        }
                    }) {
                        Image(systemName: "trash")
                            .foregroundColor(.red.opacity(0.8))
                            .font(.system(size: 12))
                            .padding(6)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    .help("刪除此密鑰")
                }
            }

            // Public Key Preview Snippet
            if !key.publicKey.isEmpty {
                Text(key.publicKey)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.gray.opacity(0.8))
                    .lineLimit(1)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.3))
                    .cornerRadius(4)
            }
        }
        .padding(14)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.15), lineWidth: 1))
    }
}
