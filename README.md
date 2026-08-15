# Termius-like High Performance SSH Terminal

> 一套參照 **Termius** 現代化設計美學與強大功能體系研發的高顏值、跨平台 SSH 終端客戶端與伺服器資產管理系統。

![Termius SSH Client](public/favicon.svg)

---

## ✨ 核心特性亮點 (Key Features)

### 1. 🖥 現代化終端與多面板分屏 (Multi-Tab & Split Terminal)
- **頂部水平多標籤頁**：支援標籤重新命名、拖拽排序、會話複製與快速重連。
- **多面板靈活分屏**：支援單面板 (Single)、水平分屏 (1x2)、垂直分屏 (2x1)、四宮格分屏 (2x2)。
- **廣播輸入模式 (Broadcast Input)**：開啟廣播後，鍵盤在任意面板輸入的指令將**同步複製並即時發送至當前標籤頁內的所有分屏面板**，極致提升多節點批量運維效率。
- **高效能渲染**：基於 `@xterm/xterm` (v5.x) + Canvas 加速 + 自動適配視窗伸縮 (Fit Addon)。
- **延遲監控 (Ping)**：底欄與面板頂部即時顯示 SSH 連線延遲 (ms) 與活動狀態。

### 2. 🗄 主機與憑證安全金庫 (Hosts & Vaults)
- **資產組織**：支援分組 (Groups)、自定義標籤 (Tags)、操作系統識別圖標 (Ubuntu, Debian, CentOS, macOS, Docker, Windows 等)。
- **多樣化認證**：密碼、私鑰 (RSA/Ed25519 + 密碼短語 Passphrase)、SSH Agent。
- **跳板機連線 (ProxyJump / Bastion)**：原生支援配置 Bastion 跳板機鏈路，自動建立通道轉發直達內網目標主機。
- **啟動腳本與保活**：支援連線後自動執行初始化指令 (如 `tmux attach` 或 `cd /var/www`)，以及 KeepAlive 保活心跳防斷線。
- **快速直連 (Quick Connect)**：支援 `username@hostname:port` 快速臨時發起 SSH 會話。

### 3. 📂 內置雙欄 SFTP 檔案管理器 (Dual-Pane SFTP)
- **左右雙欄式視圖**：左側遠端主機檔案系統，右側本地工作站檔案系統。
- **檔案傳輸佇列**：底欄抽屜展示實時傳輸進度百分比、傳輸速率與完成狀態。
- **內置 Monaco 程式碼編輯器**：雙擊遠端文字/程式碼檔案（如 `nginx.conf`, `.env`, `docker-compose.yml`），即可在內建的高亮編輯器中檢視與編輯，點擊儲存或 `Cmd+S` 直接寫回伺服器！
- **檔案操作**：支援新建目錄、重新命名、刪除與路徑麵包屑快速跳轉。

### 4. ⚡ 參數化快捷指令庫 (Parametric Snippets)
- **指令範本庫**：將高頻運維命令（如 Docker 排查、Nginx 檢查、Git Log）保存為 Snippet。
- **動態參數提取與求值**：命令中使用 `{{variable_name}}`（例如 `sudo lsof -i :{{port}}`），執行時自動彈出參數填寫視窗，並支援**一鍵廣播執行至全部終端分屏**。
- **底欄快捷抽屜**：在任意終端會話中，點擊底欄 `Quick Snippets` 即可秒級執行常用腳本。

### 5. 🌐 端口轉發隧道管理器 (Port Forwarding / Tunnels)
- **本機端口轉發 (Local -L)**：將本機端口安全轉發至遠端服務（如本機 `localhost:3306` 直連遠端 MySQL 資料庫）。
- **動態 SOCKS5 代理 (Dynamic -D)**：一鍵開啟 SOCKS5 本機代理伺服器，將流量全域穿透至 SSH 遠端網絡。
- **遠端端口轉發 (Remote -R)**：將遠端端口反向轉發至本地服務。
- **圖形化開關**：直觀的路由拓撲圖與一鍵 ON/OFF 隧道開關。

### 6. 🔑 密鑰管理中心 (Keychains)
- **本地密鑰生成器**：支援在客戶端內一鍵生成 Ed25519 或 RSA 2048-bit 密鑰對。
- **一鍵複製公鑰**：一鍵複製 `ssh-ed25519 ...` 公鑰格式，快速貼上至遠端伺服器 `~/.ssh/authorized_keys`。

### 7. 🚀 全局指令面板 (Command Palette - `Cmd+K` / `Ctrl+K`)
- 按下 `Cmd+K`（或 `Ctrl+K`）喚起 Spotlight 風格全域搜尋列，秒級檢索主機、指令庫、切換功能並一鍵發起連線。

### 8. 🎨 個性化美學主題與加密備份
- **豐富配色主題**：預設 Termius Dark、Dracula、One Dark Pro、Nord、Monokai、Solarized Dark、GitHub Dark。
- **自定義字體與樣式**：JetBrains Mono / Fira Code，可調節字號、行高、游標樣式（Block/Underline/Bar）與選取即複製。
- **金庫加密匯出/還原**：支援使用 Master Password (AES-256-GCM) 將全部主機、密鑰、指令庫與設定打包為單一備份檔案。

---

## 🛠 技術架構 (Architecture)

```
├── electron/
│   ├── main.ts              # Electron 主進程入口與 IPC 協調中心
│   ├── preload.ts           # 安全 ContextBridge 橋接 API
│   └── services/
│       ├── sshService.ts    # ssh2 高效能連線、PTY 流、ProxyJump 跳板機
│       ├── sftpService.ts   # ssh2-sftp-client 雙欄檔案與傳輸佇列
│       ├── localPtyService.ts # 本地系統 Shell 進程管理 (zsh/bash/powershell)
│       ├── tunnelService.ts # TCP 本地/遠端端口轉發與 SOCKS5 動態隧道
│       ├── vaultService.ts  # 本地 AES-256 加密持久化金庫 (Vault Store)
│       └── keygenService.ts # SSH 密鑰生成器 (Ed25519 / RSA)
└── src/
    ├── types/index.ts       # 完整 TypeScript 資料結構定義
    ├── stores/              # Zustand 全局狀態庫
    │   ├── useAppStore.ts   # UI 路由、彈窗、Toast 通知
    │   ├── useVaultStore.ts # 主機、分組、指令庫、金庫資料
    │   ├── useTerminalStore.ts # 標籤頁、分屏面板、廣播狀態
    │   └── useSftpStore.ts  # SFTP 檔案樹與傳輸任務
    ├── utils/               # 配色主題 (themePresets)、參數解析 (snippets)
    └── components/          # Termius 風格 React 組件群
```

---

## 💻 快速啟動與開發指引

### 1. 安裝依賴
```bash
npm install
```

### 2. 本地開發與熱更新 (Dev Mode)
啟動 Vite + Electron 開發環境：
```bash
npm run dev
```

### 3. 編譯與構建 (Production Build)
```bash
npm run build
```

---

## ⌨ 常用快捷鍵 (Keybindings)

| 快捷鍵 | 功能描述 |
| :--- | :--- |
| **`Cmd + K`** / **`Ctrl + K`** | 開啟全域指令面板 (Command Palette) |
| **`Cmd + S`** / **`Ctrl + S`** | SFTP 遠端檔案編輯器儲存並上傳 |
| **`ESC`** | 關閉當前開啟的彈窗或指令列 |
