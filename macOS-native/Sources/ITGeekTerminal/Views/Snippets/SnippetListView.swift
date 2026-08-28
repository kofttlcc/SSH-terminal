import SwiftUI

public struct SnippetListView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("快捷指令庫 (Snippets)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("儲存高頻運維腳本與參數化命令，一鍵發送至終端執行")
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
                LazyVStack(spacing: 12) {
                    ForEach(appState.vault.snippets) { snip in
                        HStack(alignment: .top, spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.orange.opacity(0.15))
                                    .frame(width: 32, height: 32)
                                Image(systemName: "text.curlybraces")
                                    .foregroundColor(.orange)
                                    .font(.system(size: 14))
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(snip.title)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)

                                if let desc = snip.description {
                                    Text(desc)
                                        .font(.system(size: 11))
                                        .foregroundColor(.gray)
                                }

                                Text(snip.command)
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(.yellow)
                                    .padding(6)
                                    .background(Color.black.opacity(0.4))
                                    .cornerRadius(6)
                            }

                            Spacer()

                            Button(action: {
                                appState.sendCommandToTerminal(command: snip.command)
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "play.fill")
                                    Text("執行")
                                }
                                .font(.system(size: 11, weight: .semibold))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(6)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(14)
                        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.15), lineWidth: 1))
                    }
                }
                .padding(20)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }
}
