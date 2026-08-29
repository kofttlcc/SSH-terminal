import SwiftUI

public struct InlineTerminalAIAgentBarView: View {
    @ObservedObject var appState: AppState
    @ObservedObject var agentService = DevOpsAgentService.shared
    let tabId: String
    let sessionId: String
    let host: HostItem?

    public var body: some View {
        VStack(spacing: 0) {
            if let mission = agentService.activeMissions[sessionId], mission.status != .idle && mission.status != .cancelled {
                // Active Multi-step DevOps Mission Card
                ActiveMissionDashboardView(
                    mission: mission,
                    sessionId: sessionId,
                    host: host,
                    appState: appState,
                    agentService: agentService
                )
            } else {
                // Default Natural Language Requirement Input Bar
                CompactAgentInputBarView(
                    sessionId: sessionId,
                    host: host,
                    appState: appState,
                    agentService: agentService
                )
            }
        }
        .background(Color(red: 15/255, green: 17/255, blue: 26/255))
        .overlay(Rectangle().frame(height: 1).foregroundColor(Color.purple.opacity(0.25)), alignment: .bottom)
    }
}

// MARK: - Active Mission Dashboard View
struct ActiveMissionDashboardView: View {
    let mission: DevOpsMission
    let sessionId: String
    let host: HostItem?
    @ObservedObject var appState: AppState
    @ObservedObject var agentService: DevOpsAgentService

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Mission Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                        .font(.system(size: 13, weight: .bold))
                    Text("AI DevOps 智能體任務:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.purple)
                    Text(mission.goal)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }

                Spacer()

                // Status Pill
                StatusPillView(status: mission.status, currentStep: mission.steps.count)

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
                        Text(mission.isAutonomous ? "全自動執行" : "單步確認")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(mission.isAutonomous ? .green : .orange)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(mission.isAutonomous ? Color.green.opacity(0.12) : Color.orange.opacity(0.12))
                    .cornerRadius(4)
                }
                .buttonStyle(.plain)

                // Cancel Mission Button
                Button(action: {
                    agentService.cancelMission(sessionId: sessionId, appState: appState)
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)
                .help("終止當前任務")
            }

            // Current Step Details
            if let currentStep = mission.steps.last {
                VStack(alignment: .leading, spacing: 6) {
                    // Step Title & Thought
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
                                .lineLimit(3)
                        }
                    }

                    // Command Box
                    if !currentStep.command.isEmpty {
                        HStack {
                            Text("$")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(.green)
                            Text(currentStep.command)
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundColor(.green)
                                .lineLimit(2)
                            Spacer()
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(Color.black.opacity(0.4))
                        .cornerRadius(4)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.green.opacity(0.3), lineWidth: 1))
                    }

                    // Observation Box (if any)
                    if !currentStep.observation.isEmpty {
                        HStack(alignment: .top, spacing: 6) {
                            Text("📜 觀測:")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.orange)
                            Text(currentStep.observation)
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.orange.opacity(0.9))
                                .lineLimit(2)
                        }
                    }
                }
                .padding(8)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)
            } else if mission.status == .planning {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text("🧠 AI 正在分析伺服器環境與制定運維執行步驟...")
                        .font(.system(size: 11))
                        .foregroundColor(.purple)
                }
                .padding(8)
            }

            // Mission Conclusion (When Completed)
            if mission.status == .completed {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text(mission.finalConclusion ?? "任務已成功完成！")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.green)
                    Spacer()
                    Button("關閉任務") {
                        agentService.activeMissions.removeValue(forKey: sessionId)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .controlSize(.small)
                }
                .padding(8)
                .background(Color.green.opacity(0.12))
                .cornerRadius(6)
            }

            // Action Buttons for Step-by-Step Approval Mode
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
        }
        .padding(10)
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
                Text("已完成").font(.system(size: 10, weight: .bold)).foregroundColor(.green)
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

// MARK: - Compact Input Bar View
struct CompactAgentInputBarView: View {
    let sessionId: String
    let host: HostItem?
    @ObservedObject var appState: AppState
    @ObservedObject var agentService: DevOpsAgentService

    var body: some View {
        VStack(spacing: 8) {
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
                    placeholder: "輸入運維目標（例：優化 TCP 參數並啟用 BBR、排查 80 端口佔用並重啟服務）...",
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
                .help("全自動閉環：AI 智能體自動執行、獲取輸出、分析結果並推進下一步")

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

                Spacer()
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
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
