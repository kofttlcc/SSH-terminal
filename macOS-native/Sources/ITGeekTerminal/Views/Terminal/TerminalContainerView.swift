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
                            // Embedded Inline AI Agent Bar
                            if appState.inlineAIAgentOpen {
                                InlineTerminalAIAgentBarView(
                                    appState: appState,
                                    tabId: tab.id,
                                    sessionId: firstPane.sessionId ?? firstPane.paneId,
                                    host: firstPane.host
                                )
                            }

                            // Industry-standard xterm.js Terminal View
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
