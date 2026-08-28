import SwiftUI

public struct ComposeBarView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        HStack(spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: "target")
                    .foregroundColor(.orange)
                    .font(.system(size: 12))
                Text("全部會話")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.orange)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.orange.opacity(0.15))
            .cornerRadius(6)

            TextField("在此輸入指令同步發送至全部終端會話（Enter 發送）...", text: $appState.composeCommand)
                .textFieldStyle(.plain)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)
                .onSubmit {
                    sendCommand()
                }

            Button(action: sendCommand) {
                HStack(spacing: 4) {
                    Image(systemName: "paperplane.fill")
                    Text("發送")
                }
                .font(.system(size: 11, weight: .semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
            .disabled(appState.composeCommand.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Button(action: {
                appState.composeBarOpen = false
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
    }

    private func sendCommand() {
        guard !appState.composeCommand.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let cmd = appState.composeCommand
        appState.composeCommand = ""
        appState.sendCommandToTerminal(command: cmd)
    }
}
