import SwiftUI

public struct QuickConnectModalView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.blue)
                    Text("快速直連 SSH")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                Button(action: {
                    appState.quickConnectOpen = false
                }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("連線字串 (如: root@192.168.1.1:22)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.gray)
                TextField("root@192.168.1.1:22", text: $appState.quickConnectString)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(8)
                    .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                    .cornerRadius(8)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("SSH 登入密碼")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.gray)
                SecureField("請輸入密碼", text: $appState.quickConnectPassword)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .padding(8)
                    .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                    .cornerRadius(8)
            }

            HStack {
                Button("取消") {
                    appState.quickConnectOpen = false
                }
                .buttonStyle(.bordered)

                Spacer()

                Button("立即連線") {
                    connect()
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
                .disabled(appState.quickConnectString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.top, 8)
        }
        .padding(20)
        .frame(width: 400)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray.opacity(0.2), lineWidth: 1))
    }

    private func connect() {
        var user = "root"
        var host = appState.quickConnectString.trimmingCharacters(in: .whitespacesAndNewlines)
        var port = 22

        if host.contains("@") {
            let parts = host.split(separator: "@")
            user = String(parts[0])
            host = String(parts[1])
        }

        if host.contains(":") {
            let parts = host.split(separator: ":")
            host = String(parts[0])
            port = Int(parts[1]) ?? 22
        }

        let tempHost = HostItem(
            label: "\(user)@\(host)",
            hostname: host,
            port: port,
            username: user,
            authType: .password,
            password: appState.quickConnectPassword
        )

        appState.quickConnectOpen = false
        appState.openHostTerminal(host: tempHost)
    }
}
