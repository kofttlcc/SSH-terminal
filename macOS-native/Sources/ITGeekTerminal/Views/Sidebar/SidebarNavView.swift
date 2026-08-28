import SwiftUI

public struct SidebarNavView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            // App Header
            HStack(spacing: 10) {
                if let iconPath = Bundle.main.path(forResource: "AppIcon", ofType: "png"),
                   let nsImg = NSImage(contentsOfFile: iconPath) {
                    Image(nsImage: nsImg)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)
                        .cornerRadius(8)
                        .shadow(radius: 2)
                } else {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(LinearGradient(colors: [Color.red, Color(red: 180/255, green: 20/255, blue: 30/255)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 32, height: 32)
                        Text("X")
                            .font(.system(size: 16, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("ITGeek Terminal")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    Text("Xshell 旗艦體驗 · 原生版")
                        .font(.system(size: 10))
                        .foregroundColor(.orange.opacity(0.8))
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Quick Connect Button
            Button(action: {
                appState.quickConnectOpen = true
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                    Text("快速直連 SSH")
                        .font(.system(size: 12, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.bottom, 12)

            // Navigation Items
            VStack(spacing: 4) {
                SidebarNavItem(icon: "server.rack", title: "主機資產", active: appState.activeView == "hosts", count: appState.vault.hosts.count) {
                    appState.activeView = "hosts"
                }

                if !appState.tabs.isEmpty {
                    SidebarNavItem(icon: "terminal", title: "終端會話", active: appState.activeView == "terminal", count: appState.tabs.count) {
                        appState.activeView = "terminal"
                    }
                }

                SidebarNavItem(icon: "sparkles", title: "AI 智能體", active: appState.isDrawerOpen) {
                    appState.isDrawerOpen.toggle()
                }

                SidebarNavItem(icon: "text.curlybraces", title: "指令庫 (Snippets)", active: appState.activeView == "snippets", count: appState.vault.snippets.count) {
                    appState.activeView = "snippets"
                }

                SidebarNavItem(icon: "key.fill", title: "密鑰管理", active: appState.activeView == "keys", count: appState.vault.keys.count) {
                    appState.activeView = "keys"
                }

                SidebarNavItem(icon: "gearshape.fill", title: "偏好設定", active: appState.activeView == "settings") {
                    appState.activeView = "settings"
                }
            }
            .padding(.horizontal, 8)

            Spacer()

            // Local Shell Quick Start
            Button(action: {
                appState.openLocalTerminal()
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "laptopcomputer")
                    Text("啟動本地 macOS Shell")
                        .font(.system(size: 11, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color.gray.opacity(0.15))
                .foregroundColor(.gray)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .frame(width: 210)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
    }
}

struct SidebarNavItem: View {
    let icon: String
    let title: String
    let active: Bool
    var count: Int? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundColor(active ? .cyan : .gray)
                    .frame(width: 18)

                Text(title)
                    .font(.system(size: 12, weight: active ? .semibold : .regular))
                    .foregroundColor(active ? .white : Color(red: 203/255, green: 213/255, blue: 225/255))

                Spacer()

                if let c = count {
                    Text("\(c)")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(6)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(active ? Color.cyan.opacity(0.15) : Color.clear)
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}
