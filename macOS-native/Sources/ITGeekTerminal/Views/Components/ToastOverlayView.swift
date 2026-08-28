import SwiftUI

public struct ToastOverlayView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 8) {
            Spacer()
            ForEach(appState.toasts) { toast in
                HStack(spacing: 8) {
                    Image(systemName: iconForType(toast.type))
                        .foregroundColor(colorForType(toast.type))
                    Text(toast.message)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255).opacity(0.95))
                .cornerRadius(20)
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(colorForType(toast.type).opacity(0.4), lineWidth: 1))
                .shadow(radius: 10)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.bottom, 20)
        .animation(.easeInOut, value: appState.toasts)
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "success": return "checkmark.circle.fill"
        case "error": return "xmark.circle.fill"
        case "warning": return "exclamationmark.triangle.fill"
        default: return "info.circle.fill"
        }
    }

    private func colorForType(_ type: String) -> Color {
        switch type {
        case "success": return .green
        case "error": return .red
        case "warning": return .orange
        default: return .blue
        }
    }
}
