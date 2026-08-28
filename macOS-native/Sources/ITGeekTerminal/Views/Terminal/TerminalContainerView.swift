import SwiftUI

public struct TerminalContainerView: View {
    @ObservedObject var appState: AppState
    let tab: TerminalTab

    public var body: some View {
        VStack(spacing: 0) {
            // Global Broadcast Banner
            if appState.isGlobalKeystrokeSync {
                HStack {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .foregroundColor(.orange)
                    Text("⚡ 實時鍵盤同步廣播中：在任意終端輸入將鏡像發送至所有會話")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.orange)
                    Spacer()
                    Button("停止廣播 (Esc)") {
                        appState.isGlobalKeystrokeSync = false
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .controlSize(.small)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.15))
            }

            // Main Panes View
            HStack(spacing: 0) {
                ZStack {
                    if let firstPane = tab.panes.first {
                        VStack(spacing: 0) {
                            // Pane Toolbar
                            HStack {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 8, height: 8)
                                Text(firstPane.title)
                                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                    .foregroundColor(.white)

                                Spacer()

                                Button(action: {
                                    appState.isDrawerOpen.toggle()
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "sparkles")
                                            .foregroundColor(.purple)
                                        Text("AI 智能體 (Cmd+L)")
                                            .font(.system(size: 11, weight: .medium))
                                    }
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)

                                Button(action: {
                                    appState.closeTab(tabId: tab.id)
                                }) {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10))
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.2)), alignment: .bottom)

                            // Terminal Native NSTextView
                            NativeTerminalPaneView(
                                appState: appState,
                                pane: firstPane,
                                tabId: tab.id,
                                isActive: true
                            )
                        }
                    }
                }

                // AI Assistant Drawer Side Panel
                if appState.isDrawerOpen {
                    Divider()
                    AIAssistantDrawerView(appState: appState)
                        .frame(width: 380)
                        .transition(.move(edge: .trailing))
                }
            }

            // Bottom Compose Bar
            if appState.composeBarOpen {
                Divider()
                ComposeBarView(appState: appState)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}
