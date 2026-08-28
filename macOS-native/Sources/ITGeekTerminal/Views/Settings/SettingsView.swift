import SwiftUI

public struct SettingsView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("偏好設定")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("配置 AI 智能體模型、終端字體與 Touch ID 安全金庫")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Segment Tabs
            HStack(spacing: 8) {
                SettingTabButton(title: "AI 智能體模型庫", icon: "sparkles", active: appState.settingsSelectedTab == "ai") {
                    appState.settingsSelectedTab = "ai"
                }
                SettingTabButton(title: "Touch ID 與安全", icon: "touchid", active: appState.settingsSelectedTab == "security") {
                    appState.settingsSelectedTab = "security"
                }
                SettingTabButton(title: "外觀與終端樣式", icon: "paintbrush.fill", active: appState.settingsSelectedTab == "appearance") {
                    appState.settingsSelectedTab = "appearance"
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)

            Divider()
                .background(Color.gray.opacity(0.2))

            ScrollView {
                VStack(spacing: 20) {
                    if appState.settingsSelectedTab == "ai" {
                        AISettingsSection(appState: appState)
                    } else if appState.settingsSelectedTab == "security" {
                        SecuritySettingsSection(appState: appState)
                    } else {
                        AppearanceSettingsSection(appState: appState)
                    }
                }
                .padding(20)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}

struct SettingTabButton: View {
    let title: String
    let icon: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(active ? .cyan : .gray)
                Text(title)
                    .font(.system(size: 12, weight: active ? .bold : .medium))
                    .foregroundColor(active ? .white : .gray)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(active ? Color.cyan.opacity(0.15) : Color(red: 20/255, green: 22/255, blue: 34/255))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

struct AISettingsSection: View {
    @ObservedObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("AI 服務商 (AI Provider)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                Picker("", selection: $appState.vault.settings.aiConfig.provider) {
                    ForEach(AIProvider.allCases) { p in
                        Text(p.displayName).tag(p)
                    }
                }
                .labelsHidden()
                .onChange(of: appState.vault.settings.aiConfig.provider) { newProvider in
                    if let first = newProvider.defaultModels.first {
                        appState.vault.settings.aiConfig.model = first
                    }
                    appState.saveVault()
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("API 金鑰 (API Key)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                SecureField("sk-...", text: Binding(
                    get: { appState.vault.settings.aiConfig.apiKey ?? "" },
                    set: { appState.vault.settings.aiConfig.apiKey = $0; appState.saveVault() }
                ))
                .textFieldStyle(.plain)
                .font(.system(size: 12))
                .padding(8)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(8)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("自訂模型名稱 (Model Name)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                TextField("例如: deepseek-chat, gemini-3.7-flash, claude-3-7-sonnet", text: $appState.vault.settings.aiConfig.model)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(8)
                    .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                    .cornerRadius(8)
                    .onChange(of: appState.vault.settings.aiConfig.model) { _ in
                        appState.saveVault()
                    }

                // Preset Chips
                HStack(spacing: 6) {
                    ForEach(appState.vault.settings.aiConfig.provider.defaultModels.prefix(4), id: \.self) { m in
                        Button(action: {
                            appState.vault.settings.aiConfig.model = m
                            appState.saveVault()
                        }) {
                            Text(m)
                                .font(.system(size: 10, design: .monospaced))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(appState.vault.settings.aiConfig.model == m ? Color.purple : Color.black.opacity(0.4))
                                .foregroundColor(.white)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("自訂 API 代理端點 (Base URL - 可選)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                TextField(appState.vault.settings.aiConfig.provider.defaultBaseUrl, text: Binding(
                    get: { appState.vault.settings.aiConfig.baseUrl ?? "" },
                    set: { appState.vault.settings.aiConfig.baseUrl = $0.isEmpty ? nil : $0; appState.saveVault() }
                ))
                .textFieldStyle(.plain)
                .font(.system(size: 12, design: .monospaced))
                .padding(8)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(8)
            }

            Toggle(isOn: $appState.vault.settings.aiConfig.dangerousCommandWarning) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("高危險 Shell 指令防呆攔截防護 (Zero Trust Guard)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                    Text("當 AI 建議執行涉及 rm -rf、格式化、關機或清空防火牆等危險操作時自動彈窗警告")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
            }
            .toggleStyle(.checkbox)
            .onChange(of: appState.vault.settings.aiConfig.dangerousCommandWarning) { _ in
                appState.saveVault()
            }
        }
    }
}

struct SecuritySettingsSection: View {
    @ObservedObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Toggle(isOn: $appState.vault.settings.touchIdEnabled) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("啟用 Apple Touch ID 指紋防護")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                    Text("開啟應用程式或解鎖金庫資料時要求指紋識別")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
            }
            .toggleStyle(.checkbox)
            .onChange(of: appState.vault.settings.touchIdEnabled) { _ in
                appState.saveVault()
            }
        }
    }
}

struct AppearanceSettingsSection: View {
    @ObservedObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("終端字體大小: \(Int(appState.vault.settings.fontSize)) pt")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                Slider(value: $appState.vault.settings.fontSize, in: 10...22, step: 1)
                    .onChange(of: appState.vault.settings.fontSize) { _ in
                        appState.saveVault()
                    }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("預設本機 Shell")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                TextField("/bin/zsh", text: $appState.vault.settings.localShell)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(8)
                    .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                    .cornerRadius(8)
                    .onChange(of: appState.vault.settings.localShell) { _ in
                        appState.saveVault()
                    }
            }
        }
    }
}
