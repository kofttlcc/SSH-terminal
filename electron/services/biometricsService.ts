import { systemPreferences } from 'electron';

export class BiometricsService {
  public canPromptTouchID(): boolean {
    if (process.platform !== 'darwin') return false;
    try {
      return typeof systemPreferences.canPromptTouchID === 'function' && systemPreferences.canPromptTouchID();
    } catch {
      return false;
    }
  }

  public async promptTouchID(reason: string = '請使用 Touch ID 進行指紋識別認證'): Promise<{ success: boolean; error?: string }> {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'Touch ID 僅支援 macOS 系統' };
    }

    try {
      const can = this.canPromptTouchID();
      if (!can) {
        return { success: false, error: '此 Mac 裝置目前未設定 Touch ID 或硬體不支援' };
      }
      await systemPreferences.promptTouchID(reason);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Touch ID 驗證已取消或失敗' };
    }
  }
}
