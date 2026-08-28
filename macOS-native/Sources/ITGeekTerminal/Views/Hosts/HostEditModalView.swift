import SwiftUI

public struct HostEditModalView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "server.rack")
                        .foregroundColor(.blue)
                    Text(appState.editingHost == nil ? "新增 SSH 主機" : "編輯主機設定")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                Button(action: {
                    appState.hostEditModalOpen = false
                }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)
            }

            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("主機標籤名稱").font(.system(size: 11)).foregroundColor(.gray)
                        TextField("例如: 生產環境 Web-01", text: $appState.editHostLabel)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .padding(8)
                            .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                            .cornerRadius(8)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("所屬分組").font(.system(size: 11)).foregroundColor(.gray)
                        Picker("", selection: $appState.editHostGroup) {
                            ForEach(appState.vault.groups) { grp in
                                Text(grp.name).tag(grp.id)
                            }
                        }
                        .labelsHidden()
                    }
                }

                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("伺服器 IP / 網域名稱").font(.system(size: 11)).foregroundColor(.gray)
                        TextField("例如: 192.168.1.100", text: $appState.editHostHostname)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12, design: .monospaced))
                            .padding(8)
                            .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                            .cornerRadius(8)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("端口").font(.system(size: 11)).foregroundColor(.gray)
                        TextField("22", text: $appState.editHostPort)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12, design: .monospaced))
                            .frame(width: 70)
                            .padding(8)
                            .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                            .cornerRadius(8)
                    }
                }

                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("登入使用者").font(.system(size: 11)).foregroundColor(.gray)
                        TextField("root", text: $appState.editHostUsername)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12, design: .monospaced))
                            .padding(8)
                            .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                            .cornerRadius(8)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("登入密碼").font(.system(size: 11)).foregroundColor(.gray)
                        SecureField("密碼", text: $appState.editHostPassword)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .padding(8)
                            .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                            .cornerRadius(8)
                    }
                }

                Toggle(isOn: $appState.editHostRequireTouchId) {
                    HStack {
                        Image(systemName: "touchid")
                            .foregroundColor(.purple)
                        Text("連線此主機需進行 Touch ID 指紋授權")
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                    }
                }
                .toggleStyle(.checkbox)
                .padding(.top, 4)
            }

            HStack {
                Button("取消") {
                    appState.hostEditModalOpen = false
                }
                .buttonStyle(.bordered)

                Spacer()

                Button("儲存主機") {
                    saveHost()
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
                .disabled(appState.editHostHostname.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.top, 8)
        }
        .padding(20)
        .frame(width: 480)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray.opacity(0.2), lineWidth: 1))
        .onAppear {
            if let h = appState.editingHost {
                appState.editHostLabel = h.label
                appState.editHostHostname = h.hostname
                appState.editHostPort = "\(h.port)"
                appState.editHostUsername = h.username
                appState.editHostPassword = h.password ?? ""
                appState.editHostOsType = h.osType ?? "linux"
                appState.editHostGroup = h.group ?? "prod"
                appState.editHostRequireTouchId = h.requireTouchId ?? false
            } else {
                appState.editHostLabel = ""
                appState.editHostHostname = ""
                appState.editHostPort = "22"
                appState.editHostUsername = "root"
                appState.editHostPassword = ""
                appState.editHostOsType = "linux"
                appState.editHostGroup = "prod"
                appState.editHostRequireTouchId = false
            }
        }
    }

    private func saveHost() {
        let port = Int(appState.editHostPort) ?? 22
        let lbl = appState.editHostLabel.isEmpty ? "\(appState.editHostUsername)@\(appState.editHostHostname)" : appState.editHostLabel

        if let editing = appState.editingHost,
           let idx = appState.vault.hosts.firstIndex(where: { $0.id == editing.id }) {
            appState.vault.hosts[idx].label = lbl
            appState.vault.hosts[idx].hostname = appState.editHostHostname
            appState.vault.hosts[idx].port = port
            appState.vault.hosts[idx].username = appState.editHostUsername
            appState.vault.hosts[idx].password = appState.editHostPassword
            appState.vault.hosts[idx].group = appState.editHostGroup
            appState.vault.hosts[idx].requireTouchId = appState.editHostRequireTouchId
            appState.addToast("success", "已更新主機「\(lbl)」")
        } else {
            let newHost = HostItem(
                label: lbl,
                hostname: appState.editHostHostname,
                port: port,
                username: appState.editHostUsername,
                authType: .password,
                password: appState.editHostPassword,
                group: appState.editHostGroup,
                osType: appState.editHostOsType,
                requireTouchId: appState.editHostRequireTouchId
            )
            appState.vault.hosts.append(newHost)
            appState.addToast("success", "已新增主機「\(lbl)」")
        }

        appState.saveVault()
        appState.hostEditModalOpen = false
    }
}
