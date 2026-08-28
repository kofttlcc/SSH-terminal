import SwiftUI

public struct KeyListView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("SSH 密鑰管理中心 (Keychains)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("管理 Ed25519 與 RSA 密鑰對，支援 Touch ID 硬體級生物識別保護")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider()
                .background(Color.gray.opacity(0.2))

            ScrollView {
                VStack(spacing: 12) {
                    if appState.vault.keys.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "key.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(.top, 40)
                            Text("尚未建立任何 SSH 密鑰")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Text("您可以使用終端或在此處綁定 Ed25519 / RSA 私鑰以進行免密認證。")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                    } else {
                        ForEach(appState.vault.keys) { key in
                            HStack {
                                Image(systemName: "key.fill")
                                    .foregroundColor(.yellow)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(key.name)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                    Text(key.type.uppercased())
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                            }
                            .padding(12)
                            .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                            .cornerRadius(8)
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}
