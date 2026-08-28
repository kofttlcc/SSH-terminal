import SwiftUI

public struct YubiKeyTouchPromptData: Identifiable, Equatable {
    public let id: String = UUID().uuidString
    public let hostLabel: String
    public let keyName: String
    public let serial: String
    public let onConfirm: () -> Void
    public let onCancel: () -> Void

    public static func == (lhs: YubiKeyTouchPromptData, rhs: YubiKeyTouchPromptData) -> Bool {
        lhs.id == rhs.id
    }
}

public struct YubiKeyTouchModalView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        if let prompt = appState.yubikeyTouchPrompt {
            ZStack {
                Color.black.opacity(0.8)
                    .edgesIgnoringSafeArea(.all)

                VStack(spacing: 16) {
                    // Glowing Amber Hardware Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.orange.opacity(0.2))
                            .frame(width: 64, height: 64)
                        Image(systemName: "key.horizontal.fill")
                            .foregroundColor(.orange)
                            .font(.system(size: 28))
                    }
                    .padding(.top, 8)

                    VStack(spacing: 4) {
                        Text("正在等待物理硬體金鑰觸碰驗證")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        Text("目標主機「\(prompt.hostLabel)」需要 YubiKey 實體存在證明")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }

                    // Key Details Card
                    VStack(spacing: 6) {
                        HStack {
                            Text("綁定密鑰:")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            Text(prompt.keyName)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundColor(.yellow)
                            Spacer()
                        }

                        HStack {
                            Text("設備序號:")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            Text(prompt.serial)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.white)
                            Spacer()
                        }
                    }
                    .padding(10)
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(8)

                    // Touch Indicator
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.orange)
                            .frame(width: 8, height: 8)
                        Text("請觸碰您插入的 YubiKey 綠色觸控金屬環...")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.orange.opacity(0.12))
                    .cornerRadius(8)

                    HStack(spacing: 12) {
                        Button("取消連線 (Esc)") {
                            prompt.onCancel()
                            appState.yubikeyTouchPrompt = nil
                        }
                        .buttonStyle(.bordered)

                        Spacer()

                        Button("已完成觸碰 (確認連線)") {
                            prompt.onConfirm()
                            appState.yubikeyTouchPrompt = nil
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)
                    }
                    .padding(.top, 8)
                }
                .padding(24)
                .frame(width: 440)
                .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                .cornerRadius(18)
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.orange.opacity(0.4), lineWidth: 1))
                .shadow(radius: 20)
            }
        }
    }
}
