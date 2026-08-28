import Foundation
import LocalAuthentication

@MainActor
public class BiometricsService {
    public static let shared = BiometricsService()

    public func canPromptTouchID() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    public func promptTouchID(reason: String) async -> (success: Bool, error: String?) {
        let context = LAContext()
        context.localizedCancelTitle = "取消"

        var authError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            return (false, authError?.localizedDescription ?? "此設備不支援或未啟用 Touch ID")
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return (success, success ? nil : "Touch ID 授權未通過")
        } catch let err {
            return (false, err.localizedDescription)
        }
    }
}
