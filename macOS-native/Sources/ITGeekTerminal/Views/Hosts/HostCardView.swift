import SwiftUI

public struct HostCardView: View {
    let host: HostItem
    let onConnect: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.blue.opacity(0.15))
                        .frame(width: 36, height: 36)
                    Image(systemName: "server.rack")
                        .foregroundColor(Color.blue)
                        .font(.system(size: 16))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(host.label)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("\(host.username)@\(host.hostname):\(host.port)")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }

                Spacer()

                Menu {
                    Button("編輯設定", action: onEdit)
                    Button("刪除主機", role: .destructive, action: onDelete)
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.gray)
                        .font(.system(size: 12))
                        .padding(4)
                }
                .menuStyle(.borderlessButton)
            }

            // Badges
            HStack(spacing: 6) {
                Text(host.osType?.uppercased() ?? "LINUX")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.green.opacity(0.2))
                    .foregroundColor(.green)
                    .cornerRadius(4)

                if host.requireTouchId == true {
                    HStack(spacing: 2) {
                        Image(systemName: "touchid")
                        Text("Touch ID")
                    }
                    .font(.system(size: 9, weight: .medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.purple.opacity(0.2))
                    .foregroundColor(.purple)
                    .cornerRadius(4)
                }

                Spacer()
            }

            Divider()
                .background(Color.gray.opacity(0.2))

            // Connect Button
            Button(action: onConnect) {
                HStack {
                    Image(systemName: "terminal.fill")
                    Text("連線 SSH")
                        .font(.system(size: 12, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 7)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray.opacity(0.15), lineWidth: 1))
    }
}
