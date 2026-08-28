import SwiftUI

public struct DangerousCommandModalView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        if let danger = appState.pendingDangerousCommand {
            ZStack {
                Color.black.opacity(0.75)
                    .edgesIgnoringSafeArea(.all)

                VStack(spacing: 16) {
                    // Header
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(Color.red.opacity(0.2))
                                .frame(width: 36, height: 36)
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 18))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("⚠️ 偵測到高風險破壞性指令！")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text("零信任防呆攔截已觸發，請仔細確認該指令的危害性")
                                .font(.system(size: 11))
                                .foregroundColor(.red.opacity(0.8))
                        }
                        Spacer()
                    }

                    if let reason = danger.riskReason {
                        Text(reason)
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 254/255, green: 202/255, blue: 202/255))
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.15))
                            .cornerRadius(8)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("欲執行的指令內容：")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.gray)
                        Text(danger.command)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundColor(.yellow)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.black.opacity(0.5))
                            .cornerRadius(8)
                    }

                    HStack {
                        Button("取消執行 (Esc)") {
                            appState.pendingDangerousCommand = nil
                        }
                        .buttonStyle(.bordered)

                        Spacer()

                        Button("我已明瞭風險，強制執行") {
                            let cmd = danger.command
                            appState.pendingDangerousCommand = nil
                            appState.sendCommandToTerminal(command: cmd, bypassWarning: true)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                    }
                    .padding(.top, 8)
                }
                .padding(20)
                .frame(width: 480)
                .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                .cornerRadius(16)
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.red.opacity(0.4), lineWidth: 1))
            }
        }
    }
}
