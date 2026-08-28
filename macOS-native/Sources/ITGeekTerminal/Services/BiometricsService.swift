import Foundation
import LocalAuthentication

public class BiometricsService {
    public static let shared = BiometricsService()

    public func canPromptTouchID() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    public func promptTouchID(reason: String) async -> (success: Bool, error: String?) {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let context = LAContext()
                context.localizedCancelTitle = "取消"

                var authError: NSError?
                guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                    continuation.resume(returning: (false, authError?.localizedDescription ?? "此設備不支援或未啟用 Touch ID"))
                    return
                }

                context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                    continuation.resume(returning: (success, error?.localizedDescription))
                }
            }
        }
    }
}
