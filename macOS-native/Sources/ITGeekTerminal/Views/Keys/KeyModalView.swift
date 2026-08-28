import SwiftUI

public struct KeyModalView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        ZStack {
            Color.black.opacity(0.65)
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    if !appState.keyModalIsGenerating {
                        appState.keyModalOpen = false
                    }
                }

            VStack(spacing: 0) {
                // Header
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "key.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 16))
                        Text(appState.keyModalNewlyCreatedKey != nil ? "密鑰已成功生成" : "SSH 密鑰生成與管理")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Button(action: {
                        appState.keyModalOpen = false
                    }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                }
                .padding(16)
                .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .bottom)

                if let createdKey = appState.keyModalNewlyCreatedKey {
                    // Success View with Public Key Copy & Instructions
                    VStack(spacing: 16) {
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 44))
                                .foregroundColor(.green)
                            Text("已成功使用 Touch ID 生成「\(createdKey.name)」私鑰！")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text("指紋硬體保護: \(createdKey.touchIdProtected == true ? "🔒 已啟用 Touch ID" : "未啟用")  |  演算法: \(createdKey.type.uppercased())")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 8)

                        // Public Key Display Box
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("公鑰內容 (Public Key):")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.white)
                                Spacer()
                                Button(action: {
                                    NSPasteboard.general.clearContents()
                                    NSPasteboard.general.setString(createdKey.publicKey, forType: .string)
                                    appState.addToast("success", "已複製公鑰至剪貼簿！可貼至伺服器 ~/.ssh/authorized_keys")
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "doc.on.doc")
                                        Text("複製公鑰")
                                    }
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.cyan)
                                }
                                .buttonStyle(.plain)
                            }

                            Text(createdKey.publicKey)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(Color(red: 147/255, green: 197/255, blue: 253/255))
                                .padding(10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.black.opacity(0.4))
                                .cornerRadius(6)
                                .textSelection(.enabled)
                        }

                        // Fingerprint Info
                        if let fp = createdKey.fingerprint {
                            HStack {
                                Text("SHA256 指紋:")
                                    .font(.system(size: 10))
                                    .foregroundColor(.gray)
                                Text(fp)
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(.yellow)
                                Spacer()
                            }
                        }

                        Spacer()

                        Button("完成並關閉") {
                            appState.keyModalOpen = false
                            appState.keyModalNewlyCreatedKey = nil
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                        .controlSize(.large)
                    }
                    .padding(20)
                } else {
                    // Tabs Header
                    HStack(spacing: 0) {
                        TabButton(title: "🛡️ 使用 Touch ID 重新生成", isSelected: appState.keyModalTab == "generate") {
                            appState.keyModalTab = "generate"
                        }
                        TabButton(title: "📥 匯入現有私鑰", isSelected: appState.keyModalTab == "import") {
                            appState.keyModalTab = "import"
                        }
                    }
                    .background(Color(red: 12/255, green: 14/255, blue: 22/255))

                    ScrollView {
                        VStack(spacing: 16) {
                            if appState.keyModalTab == "generate" {
                                // Generator Form
                                VStack(alignment: .leading, spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("密鑰名稱 / 別名 *")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        TextField("例如：lijt-macbook-air, prod-key", text: $appState.keyModalName)
                                            .textFieldStyle(.roundedBorder)
                                    }

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("加密演算法類型 *")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        Picker("", selection: $appState.keyModalType) {
                                            Text("Ed25519 (推薦/最新最安全)").tag("ed25519")
                                            Text("RSA 4096-bit (高相容性)").tag("rsa")
                                            Text("ECDSA 256-bit (橢圓曲線)").tag("ecdsa")
                                        }
                                        .pickerStyle(.segmented)
                                    }

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("公鑰註釋 (Comment)")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        TextField("例如：lijt@macbook-air (選填)", text: $appState.keyModalComment)
                                            .textFieldStyle(.roundedBorder)
                                    }

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("密鑰密碼 (Passphrase, 選填)")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        SecureField("若留空則為無密碼私鑰", text: $appState.keyModalPassphrase)
                                            .textFieldStyle(.roundedBorder)
                                    }

                                    // Touch ID Protection Toggle Banner
                                    Toggle(isOn: $appState.keyModalTouchIdProtected) {
                                        HStack(spacing: 6) {
                                            Image(systemName: "touchid")
                                                .foregroundColor(.purple)
                                                .font(.system(size: 16))
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("啟用 Touch ID 指紋硬體保護 (強烈推薦)")
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(.white)
                                                Text("在每次調用此私鑰認證主機時，強制驗證本機 Touch ID 指紋")
                                                    .font(.system(size: 10))
                                                    .foregroundColor(.gray)
                                            }
                                        }
                                    }
                                    .padding(12)
                                    .background(Color.purple.opacity(0.12))
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.purple.opacity(0.3), lineWidth: 1))

                                    // Auto Apply to Hosts Toggle
                                    Toggle(isOn: $appState.keyModalApplyToAllHosts) {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("自動將此新密鑰關聯至所有主機")
                                                .font(.system(size: 11, weight: .semibold))
                                                .foregroundColor(.white)
                                            Text("自動更新現有所有主機配置使用此新生成之 Touch ID 密鑰")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                    .padding(.top, 4)
                                }
                            } else {
                                // Import Form
                                VStack(alignment: .leading, spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("密鑰別名 *")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        TextField("例如：imported-company-key", text: $appState.keyModalImportName)
                                            .textFieldStyle(.roundedBorder)
                                    }

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("私鑰內容 (PEM 格式) *")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                        TextEditor(text: $appState.keyModalImportPrivateKey)
                                            .font(.system(size: 11, design: .monospaced))
                                            .frame(height: 120)
                                            .padding(4)
                                            .background(Color.black.opacity(0.3))
                                            .cornerRadius(6)
                                    }

                                    Toggle(isOn: $appState.keyModalImportTouchIdProtected) {
                                        Text("為此匯入之私鑰啟用 Touch ID 指紋保護")
                                            .font(.system(size: 11, weight: .medium))
                                    }
                                }
                            }
                        }
                        .padding(20)
                    }

                    // Footer Actions
                    HStack {
                        Button("取消") {
                            appState.keyModalOpen = false
                        }
                        .buttonStyle(.plain)
                        .foregroundColor(.gray)

                        Spacer()

                        Button(action: {
                            if appState.keyModalTab == "generate" {
                                handleGenerate()
                            } else {
                                handleImport()
                            }
                        }) {
                            HStack(spacing: 6) {
                                if appState.keyModalIsGenerating {
                                    ProgressView()
                                        .controlSize(.small)
                                } else {
                                    Image(systemName: "touchid")
                                    Text(appState.keyModalTab == "generate" ? "驗證 Touch ID 並生成私鑰" : "確認匯入私鑰")
                                }
                            }
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.purple)
                            .foregroundColor(.white)
                            .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                        .disabled(appState.keyModalIsGenerating || (appState.keyModalTab == "generate" ? appState.keyModalName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty : (appState.keyModalImportName.isEmpty || appState.keyModalImportPrivateKey.isEmpty)))
                    }
                    .padding(16)
                    .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                    .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .top)
                }
            }
            .frame(width: 520, height: 500)
            .background(Color(red: 11/255, green: 12/255, blue: 19/255))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.6), radius: 20)
        }
    }

    private func handleGenerate() {
        let name = appState.keyModalName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        appState.keyModalIsGenerating = true

        Task {
            if appState.keyModalTouchIdProtected {
                let res = await BiometricsService.shared.promptTouchID(
                    reason: "正在建立受 Touch ID 保護的 SSH 私鑰「\(name)」，請驗證指紋"
                )
                if !res.success {
                    await MainActor.run {
                        appState.keyModalIsGenerating = false
                        appState.addToast("warning", "Touch ID 授權未通過，已取消生成密鑰")
                    }
                    return
                }
            }

            do {
                let keyPair = try KeygenService.shared.generateKeyPair(
                    name: name,
                    type: appState.keyModalType,
                    comment: appState.keyModalComment,
                    passphrase: appState.keyModalPassphrase
                )

                let newKey = SSHKeyItem(
                    name: name,
                    type: appState.keyModalType,
                    privateKey: keyPair.privateKey,
                    publicKey: keyPair.publicKey,
                    passphrase: appState.keyModalPassphrase.isEmpty ? nil : appState.keyModalPassphrase,
                    fingerprint: keyPair.fingerprint,
                    touchIdProtected: appState.keyModalTouchIdProtected,
                    storageType: "software"
                )

                await MainActor.run {
                    appState.vault.keys.insert(newKey, at: 0)

                    if appState.keyModalApplyToAllHosts {
                        for idx in 0..<appState.vault.hosts.count {
                            appState.vault.hosts[idx].keyId = newKey.id
                            appState.vault.hosts[idx].requireTouchId = appState.keyModalTouchIdProtected
                        }
                    }

                    appState.saveVault()
                    appState.keyModalIsGenerating = false
                    appState.keyModalNewlyCreatedKey = newKey
                    appState.addToast("success", "已成功生成 Touch ID 保護私鑰「\(name)」")
                }
            } catch {
                await MainActor.run {
                    appState.keyModalIsGenerating = false
                    appState.addToast("error", "生成密鑰失敗: \(error.localizedDescription)")
                }
            }
        }
    }

    private func handleImport() {
        let name = appState.keyModalImportName.trimmingCharacters(in: .whitespacesAndNewlines)
        let priv = appState.keyModalImportPrivateKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, !priv.isEmpty else { return }

        let fp = KeygenService.shared.extractFingerprint(publicKey: priv)
        let newKey = SSHKeyItem(
            name: name,
            type: priv.contains("ED25519") ? "ed25519" : "rsa",
            privateKey: priv,
            publicKey: "ssh-imported-key",
            passphrase: appState.keyModalImportPassphrase.isEmpty ? nil : appState.keyModalImportPassphrase,
            fingerprint: fp,
            touchIdProtected: appState.keyModalImportTouchIdProtected,
            storageType: "software"
        )

        appState.vault.keys.insert(newKey, at: 0)
        appState.saveVault()
        appState.keyModalOpen = false
        appState.addToast("success", "已成功匯入私鑰「\(name)」")
    }
}

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .white : .gray)
                Rectangle()
                    .fill(isSelected ? Color.purple : Color.clear)
                    .frame(height: 2)
            }
            .padding(.top, 10)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}
