import SwiftUI

public struct MainView: View {
    @StateObject private var appState = AppState()

    public init() {}

    public var body: some View {
        ZStack {
            // Main Window Content
            HStack(spacing: 0) {
                // Sidebar
                SidebarNavView(appState: appState)

                Divider()
                    .background(Color.gray.opacity(0.2))

                // Content View
                VStack(spacing: 0) {
                    // Top Horizontal Tab Bar (when tabs exist)
                    if !appState.tabs.isEmpty {
                        TopTabBarView(appState: appState)
                    }

                    // Content Switcher with persistent Terminal Container
                    ZStack {
                        // Persistently mounted Terminal Containers for each tab
                        ForEach(appState.tabs) { tab in
                            TerminalContainerView(appState: appState, tab: tab)
                                .opacity((appState.activeView == "terminal" && appState.activeTabId == tab.id) ? 1 : 0)
                                .allowsHitTesting(appState.activeView == "terminal" && appState.activeTabId == tab.id)
                        }

                        // Other Views
                        if appState.activeView == "hosts" {
                            HostListView(appState: appState)
                        } else if appState.activeView == "snippets" {
                            SnippetListView(appState: appState)
                        } else if appState.activeView == "keys" {
                            KeyListView(appState: appState)
                        } else if appState.activeView == "settings" {
                            SettingsView(appState: appState)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }

            // Quick Connect Modal Overlay
            if appState.quickConnectOpen {
                ZStack {
                    Color.black.opacity(0.6).edgesIgnoringSafeArea(.all)
                        .onTapGesture { appState.quickConnectOpen = false }
                    QuickConnectModalView(appState: appState)
                }
            }

            // Host Edit Modal Overlay
            if appState.hostEditModalOpen {
                ZStack {
                    Color.black.opacity(0.6).edgesIgnoringSafeArea(.all)
                        .onTapGesture { appState.hostEditModalOpen = false }
                    HostEditModalView(appState: appState)
                }
            }

            // Key Generate / Import Modal Overlay
            if appState.keyModalOpen {
                KeyModalView(appState: appState)
            }

            // Dangerous Command Warning Modal
            DangerousCommandModalView(appState: appState)

            // YubiKey Hardware Touch Modal
            YubiKeyTouchModalView(appState: appState)

            // Global Floating Toast Overlay
            ToastOverlayView(appState: appState)
        }
        .frame(minWidth: 1000, minHeight: 650)
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}

struct TopTabBarView: View {
    @ObservedObject var appState: AppState

    var body: some View {
        HStack(spacing: 4) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(appState.tabs) { tab in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(appState.activeTabId == tab.id ? Color.green : Color.gray)
                                .frame(width: 6, height: 6)

                            Text(tab.title)
                                .font(.system(size: 11, weight: appState.activeTabId == tab.id ? .semibold : .regular))
                                .foregroundColor(appState.activeTabId == tab.id ? .white : .gray)
                                .lineLimit(1)

                            Button(action: {
                                appState.closeTab(tabId: tab.id)
                            }) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 8))
                                    .foregroundColor(.gray)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(appState.activeTabId == tab.id ? Color(red: 20/255, green: 22/255, blue: 34/255) : Color.clear)
                        .cornerRadius(6)
                        .onTapGesture {
                            appState.activeTabId = tab.id
                            appState.activeView = "terminal"
                        }
                    }
                }
            }

            Spacer()

            // Broadcast Toggle Button
            Button(action: {
                appState.isGlobalKeystrokeSync.toggle()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .foregroundColor(appState.isGlobalKeystrokeSync ? .orange : .gray)
                    Text("實時廣播")
                        .font(.system(size: 11))
                        .foregroundColor(appState.isGlobalKeystrokeSync ? .orange : .gray)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(appState.isGlobalKeystrokeSync ? Color.orange.opacity(0.15) : Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)
            }
            .buttonStyle(.plain)

            // Compose Bar Toggle Button
            Button(action: {
                appState.composeBarOpen.toggle()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "rectangle.bottomthird.inset.filled")
                        .foregroundColor(appState.composeBarOpen ? .cyan : .gray)
                    Text("撰寫欄")
                        .font(.system(size: 11))
                        .foregroundColor(appState.composeBarOpen ? .cyan : .gray)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(appState.composeBarOpen ? Color.cyan.opacity(0.15) : Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .bottom)
    }
}
