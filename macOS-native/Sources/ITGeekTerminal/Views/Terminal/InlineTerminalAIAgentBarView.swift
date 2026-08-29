import SwiftUI
import AppKit

public struct InlineTerminalAIAgentBarView: View {
    @ObservedObject var appState: AppState
    @ObservedObject var agentService = DevOpsAgentService.shared
    let tabId: String
    let sessionId: String
    let host: HostItem?

    public var body: some View {
        VStack(spacing: 0) {
            if let mission = agentService.activeMissions[sessionId], mission.status != .idle && mission.status != .cancelled {
                // Active Multi-step DevOps Mission Card (Fixed User-Locked Height)
                ActiveMissionDashboardView(
                    mission: mission,
                    sessionId: sessionId,
                    host: host,
                    appState: appState,
                    agentService: agentService
                )
                .frame(height: appState.inlineAgentPanelHeight)
            } else {
                // Default Natural Language Requirement Input Bar (Idle / Initial Connected State)
                CompactAgentInputBarView(
                    sessionId: sessionId,
                    host: host,
                    appState: appState,
                    agentService: agentService
                )
                .frame(height: max(75, min(appState.inlineAgentPanelHeight, 260)))
            }

            // Draggable Resize Bar Handle (Always active and visible in ALL states)
            AgentResizeHandleView(appState: appState)
        }
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .overlay(Rectangle().frame(height: 1).foregroundColor(Color.purple.opacity(0.25)), alignment: .bottom)
    }
}

// MARK: - Draggable Resize Handle (Always Active)
struct AgentResizeHandleView: View {
    @ObservedObject var appState: AppState

    var body: some View {
        HStack(spacing: 8) {
            Spacer()

            // Visual Grip Handle
            Capsule()
                .fill(appState.isResizeHandleHovering ? Color.purple : Color.gray.opacity(0.45))
                .frame(width: 48, height: 4)

            Spacer()
        }
        .frame(height: 9)
        .frame(maxWidth: .infinity)
        .background(appState.isResizeHandleHovering ? Color.purple.opacity(0.18) : Color(red: 12/255, green: 14/255, blue: 20/255))
        .contentShape(Rectangle())
        .onHover { hovering in
            appState.isResizeHandleHovering = hovering
            if hovering {
                NSCursor.resizeUpDown.push()
            } else {
                NSCursor.pop()
            }
        }
        .gesture(
            DragGesture(minimumDistance: 1)
                .onChanged { gesture in
                    let newHeight = appState.inlineAgentInitialDragHeight + gesture.translation.height
                    appState.inlineAgentPanelHeight = max(75, min(850, newHeight))
                }
                .onEnded { _ in
                    appState.inlineAgentInitialDragHeight = appState.inlineAgentPanelHeight
                }
        )
    }
}

// MARK: - Active Mission Dashboard View (Fully Locked Height & Continuous Follow-up)
struct ActiveMissionDashboardView: View {
    let mission: DevOpsMission
    let sessionId: String
    let host: HostItem?
    @ObservedObject var appState: AppState
    @ObservedObject var agentService: DevOpsAgentService

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // MARK: 1. Top Header Row (Fixed)
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                        .font(.system(size: 13, weight: .bold))
                    Text("AI DevOps 智能體:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.purple)
                    Text(mission.goal)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }

                Spacer()

                // Height Preset Buttons
                HStack(spacing: 3) {
                    Button("緊湊") {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            appState.inlineAgentPanelHeight = 220
                            appState.inlineAgentInitialDragHeight = 220
                        }
                    }
                    .font(.system(size: 9))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(appState.inlineAgentPanelHeight <= 240 ? Color.purple.opacity(0.35) : Color.black.opacity(0.25))
                    .cornerRadius(3)
                    .buttonStyle(.plain)

                    Button("標準") {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            appState.inlineAgentPanelHeight = 360
                            appState.inlineAgentInitialDragHeight = 360
                        }
                    }
                    .font(.system(size: 9))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background((appState.inlineAgentPanelHeight > 240 && appState.inlineAgentPanelHeight <= 450) ? Color.purple.opacity(0.35) : Color.black.opacity(0.25))
                    .cornerRadius(3)
                    .buttonStyle(.plain)

                    Button("全覽") {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            appState.inlineAgentPanelHeight = 560
                            appState.inlineAgentInitialDragHeight = 560
                        }
                    }
                    .font(.system(size: 9))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(appState.inlineAgentPanelHeight > 450 ? Color.purple.opacity(0.35) : Color.black.opacity(0.25))
                    .cornerRadius(3)
                    .buttonStyle(.plain)
                }
                .foregroundColor(.gray)

                // Status Pill
                StatusPillView(status: mission.status, currentStep: mission.steps.count)

                // History Toggle Button
                if mission.steps.count > 1 {
                    Button(action: {
                        appState.inlineAgentHistoryExpanded.toggle()
                    }) {
                        HStack(spacing: 3) {
                            Image(systemName: appState.inlineAgentHistoryExpanded ? "chevron.up" : "chevron.down")
                            Text("歷史步驟 (\(mission.steps.count))")
                        }
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                        .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                }

                // Autonomous Mode Toggle
                Button(action: {
                    if var m = agentService.activeMissions[sessionId] {
                        m.isAutonomous.toggle()
                        agentService.activeMissions[sessionId] = m
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: mission.isAutonomous ? "bolt.fill" : "hand.raised.fill")
                            .foregroundColor(mission.isAutonomous ? .green : .orange)
                            .font(.system(size: 10))
                        Text(mission.isAutonomous ? "全自動閉環" : "單步確認")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(mission.isAutonomous ? .green : .orange)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(mission.isAutonomous ? Color.green.opacity(0.12) : Color.orange.opacity(0.12))
                    .cornerRadius(4)
                }
                .buttonStyle(.plain)

                // Close / Reset Mission Button
                Button(action: {
                    agentService.cancelMission(sessionId: sessionId, appState: appState)
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)
                .help("結束並關閉此任務")
            }

            // MARK: 2. Middle Content Area (Expands to fill available height)
            ZStack {
                if mission.status == .completed, let conclusion = mission.finalConclusion {
                    // Completed Conclusion Report View
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                                .font(.system(size: 12))
                            Text("任務結論與分析報告:")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.green)
                            Spacer()
                        }

                        ScrollView(.vertical, showsIndicators: true) {
                            Text(conclusion)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(.white)
                                .lineSpacing(4)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .textSelection(.enabled)
                                .padding(4)
                        }
                    }
                    .padding(8)
                    .background(Color.green.opacity(0.08))
                    .cornerRadius(6)
                } else if appState.inlineAgentHistoryExpanded && mission.steps.count > 1 {
                    // History Steps List
                    ScrollView(.vertical, showsIndicators: true) {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(mission.steps) { step in
                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 6) {
                                        Image(systemName: step.status == "success" ? "checkmark.circle.fill" : (step.status == "running" ? "circle.dotted" : "xmark.circle.fill"))
                                            .foregroundColor(step.status == "success" ? .green : (step.status == "running" ? .yellow : .red))
                                            .font(.system(size: 10))

                                        Text("步驟 \(step.stepNumber): \(step.title)")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.white)
                                    }

                                    if !step.thought.isEmpty {
                                        Text("🧠 \(step.thought)")
                                            .font(.system(size: 9))
                                            .foregroundColor(.gray)
                                            .lineLimit(2)
                                    }

                                    if !step.command.isEmpty {
                                        Text("$ \(step.command)")
                                            .font(.system(size: 9, design: .monospaced))
                                            .foregroundColor(.green.opacity(0.9))
                                            .lineLimit(1)
                                    }

                                    if !step.observation.isEmpty {
                                        Text("📜 \(step.observation)")
                                            .font(.system(size: 9, design: .monospaced))
                                            .foregroundColor(.orange.opacity(0.85))
                                            .lineLimit(2)
                                    }
                                }
                                .padding(6)
                                .background(Color.black.opacity(0.3))
                                .cornerRadius(4)
                            }
                        }
                        .padding(2)
                    }
                } else if let currentStep = mission.steps.last {
                    // Current Step In-Progress View
                    ScrollView(.vertical, showsIndicators: true) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .top, spacing: 6) {
                                Text("步驟 \(currentStep.stepNumber):")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(.cyan)

                                Text(currentStep.title)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.white)
                            }

                            if !currentStep.thought.isEmpty {
                                HStack(alignment: .top, spacing: 6) {
                                    Text("🧠 推論:")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.purple.opacity(0.9))
                                    Text(currentStep.thought)
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                            }

                            if !currentStep.command.isEmpty {
                                HStack {
                                    Text("$")
                                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                                        .foregroundColor(.green)
                                    Text(currentStep.command)
                                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                                        .foregroundColor(.green)
                                        .textSelection(.enabled)
                                    Spacer()
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(Color.black.opacity(0.4))
                                .cornerRadius(4)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.green.opacity(0.3), lineWidth: 1))
                            }

                            if !currentStep.observation.isEmpty {
                                HStack(alignment: .top, spacing: 6) {
                                    Text("📜 觀測:")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.orange)
                                    Text(currentStep.observation)
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(.orange.opacity(0.9))
                                        .textSelection(.enabled)
                                }
                            }
                        }
                        .padding(6)
                    }
                    .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                    .cornerRadius(6)
                } else if mission.status == .planning {
                    HStack(spacing: 8) {
                        ProgressView().controlSize(.small)
                        Text("🧠 AI 正在分析伺服器環境與制定運維執行步驟...")
                            .font(.system(size: 11))
                            .foregroundColor(.purple)
                        Spacer()
                    }
                    .padding(8)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Step Approval Buttons (When waiting in manual mode)
            if mission.status == .waitingApproval {
                HStack(spacing: 8) {
                    Spacer()
                    Button("中止") {
                        agentService.cancelMission(sessionId: sessionId, appState: appState)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)

                    Button("▶️ 執行此步驟") {
                        agentService.runCurrentStep(sessionId: sessionId, host: host, isLocal: host == nil, appState: appState)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                    .controlSize(.small)
                }
            }

            // MARK: 3. Bottom Follow-up Input Bar (Fixed)
            HStack(spacing: 6) {
                Image(systemName: "bubble.left.and.text.bubble.right.fill")
                    .foregroundColor(.purple)
                    .font(.system(size: 12))

                NativeMacOSTextField(
                    text: $appState.inlineAgentFollowUpText,
                    placeholder: "💬 深入追問或下達後續指令（例：幫我切換為方案 B、測試延遲、寫入開機自啟）...",
                    fontSize: 11,
                    isMonospaced: false,
                    onSubmit: {
                        sendFollowUp()
                    }
                )
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color(red: 24/255, green: 27/255, blue: 40/255))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.purple.opacity(0.3), lineWidth: 1))

                Button(action: sendFollowUp) {
                    HStack(spacing: 4) {
                        Image(systemName: "paperplane.fill")
                        Text("深入處理")
                    }
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.purple)
                    .foregroundColor(.white)
                    .cornerRadius(5)
                }
                .buttonStyle(.plain)
                .disabled(appState.inlineAgentFollowUpText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || mission.status == .planning || mission.status == .executing)

                Button("結束任務") {
                    agentService.cancelMission(sessionId: sessionId, appState: appState)
                }
                .buttonStyle(.plain)
                .font(.system(size: 10))
                .foregroundColor(.gray)
                .padding(.horizontal, 4)
            }
            .padding(.top, 1)
        }
        .padding(.horizontal, 10)
        .padding(.top, 8)
        .padding(.bottom, 4)
    }

    private func sendFollowUp() {
        let text = appState.inlineAgentFollowUpText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        appState.inlineAgentFollowUpText = ""
        agentService.continueMission(
            sessionId: sessionId,
            followUp: text,
            host: host,
            isLocal: host == nil,
            appState: appState
        )
    }
}

struct StatusPillView: View {
    let status: DevOpsMissionStatus
    let currentStep: Int

    var body: some View {
        HStack(spacing: 4) {
            switch status {
            case .planning:
                ProgressView().controlSize(.mini)
                Text("規劃中").font(.system(size: 10, weight: .bold)).foregroundColor(.purple)
            case .executing:
                Circle().fill(Color.yellow).frame(width: 6, height: 6)
                Text("第 \(currentStep) 步執行中...").font(.system(size: 10, weight: .bold)).foregroundColor(.yellow)
            case .waitingApproval:
                Circle().fill(Color.orange).frame(width: 6, height: 6)
                Text("等待確認").font(.system(size: 10, weight: .bold)).foregroundColor(.orange)
            case .completed:
                Image(systemName: "checkmark").font(.system(size: 9, weight: .bold)).foregroundColor(.green)
                Text("已完成/就緒").font(.system(size: 10, weight: .bold)).foregroundColor(.green)
            case .failed:
                Image(systemName: "exclamationmark.triangle").font(.system(size: 9, weight: .bold)).foregroundColor(.red)
                Text("失敗").font(.system(size: 10, weight: .bold)).foregroundColor(.red)
            default:
                EmptyView()
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(Color.black.opacity(0.3))
        .cornerRadius(4)
    }
}

// MARK: - Compact Input Bar View (Idle State directly accessible with resizer)
struct CompactAgentInputBarView: View {
    let sessionId: String
    let host: HostItem?
    @ObservedObject var appState: AppState
    @ObservedObject var agentService: DevOpsAgentService

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Main Input & Controls Row
            HStack(spacing: 8) {
                // AI Agent Badge
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                        .font(.system(size: 13, weight: .bold))
                    Text("AI Agent")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.purple)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.purple.opacity(0.15))
                .cornerRadius(6)

                // Natural Language Command Input
                NativeMacOSTextField(
                    text: $appState.inlineAIAgentInput,
                    placeholder: "輸入運維目標（例：分析 tc 服務、優化 TCP 參數並啟用 BBR、排查 80 端口）...",
                    fontSize: 12,
                    isMonospaced: false,
                    onSubmit: {
                        startDevOpsMission()
                    }
                )
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)

                // Auto-Run Mode Toggle Pill
                Button(action: {
                    appState.isAIAgentAutoRun.toggle()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: appState.isAIAgentAutoRun ? "bolt.fill" : "hand.raised.fill")
                            .foregroundColor(appState.isAIAgentAutoRun ? .green : .orange)
                            .font(.system(size: 10))
                        Text(appState.isAIAgentAutoRun ? "全自動閉環" : "單步確認")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(appState.isAIAgentAutoRun ? .green : .orange)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(appState.isAIAgentAutoRun ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .help("全自動閉環：AI 智能體自動執行、獲取輸出、分析結果並連續推進")

                // Execute Button
                Button(action: startDevOpsMission) {
                    HStack(spacing: 4) {
                        Image(systemName: "play.fill")
                        Text("啟動 Agent")
                    }
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(LinearGradient(colors: [Color.purple, Color.blue], startPoint: .leading, endPoint: .trailing))
                    .foregroundColor(.white)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .disabled(appState.inlineAIAgentInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            // Quick Operations Pills Row
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    Text("推薦運維目標:")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)

                    QuickAgentPill(title: "🚀 優化 TCP 並啟用 BBR") {
                        appState.inlineAIAgentInput = "檢查這台伺服器是否支援 BBR 擁塞控制，配置優化核心網路參數並成功啟用 BBR"
                        startDevOpsMission()
                    }

                    QuickAgentPill(title: "🔍 診斷伺服器負載") {
                        appState.inlineAIAgentInput = "快速檢查目前伺服器的 CPU、記憶體、負載與磁碟空間"
                        startDevOpsMission()
                    }

                    QuickAgentPill(title: "🧹 清理系統暫存與快取") {
                        appState.inlineAIAgentInput = "安全清理系統 /tmp 暫存檔案與快取以釋放磁碟"
                        startDevOpsMission()
                    }

                    QuickAgentPill(title: "🐳 檢查 Docker 容器") {
                        appState.inlineAIAgentInput = "檢視正在運行的 Docker 容器與異常重啟狀態"
                        startDevOpsMission()
                    }

                    QuickAgentPill(title: "🌐 排查端口佔用") {
                        appState.inlineAIAgentInput = "檢查當前伺服器監聽的所有網路端口與連線狀態"
                        startDevOpsMission()
                    }
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }

    private func startDevOpsMission() {
        let goal = appState.inlineAIAgentInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !goal.isEmpty else { return }

        appState.inlineAIAgentInput = ""
        agentService.startMission(
            sessionId: sessionId,
            goal: goal,
            host: host,
            isLocal: host == nil,
            isAutonomous: appState.isAIAgentAutoRun,
            appState: appState
        )
    }
}

struct QuickAgentPill: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.cyan)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color.cyan.opacity(0.12))
                .cornerRadius(5)
        }
        .buttonStyle(.plain)
    }
}
