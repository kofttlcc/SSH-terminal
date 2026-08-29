import Foundation

public enum DevOpsMissionStatus: String, Codable {
    case idle = "idle"
    case planning = "planning"
    case executing = "executing"
    case observing = "observing"
    case waitingApproval = "waitingApproval"
    case completed = "completed"
    case failed = "failed"
    case cancelled = "cancelled"
}

public struct DevOpsStep: Identifiable, Codable, Hashable {
    public var id: String
    public var stepNumber: Int
    public var title: String
    public var thought: String
    public var command: String
    public var status: String // "pending", "running", "success", "failed", "skipped"
    public var observation: String
    public var exitCode: Int?

    public init(
        id: String = UUID().uuidString,
        stepNumber: Int = 1,
        title: String = "",
        thought: String = "",
        command: String = "",
        status: String = "pending",
        observation: String = "",
        exitCode: Int? = nil
    ) {
        self.id = id
        self.stepNumber = stepNumber
        self.title = title
        self.thought = thought
        self.command = command
        self.status = status
        self.observation = observation
        self.exitCode = exitCode
    }
}

public struct DevOpsMission: Identifiable, Codable {
    public var id: String
    public var sessionId: String
    public var goal: String
    public var status: DevOpsMissionStatus
    public var isAutonomous: Bool
    public var steps: [DevOpsStep]
    public var currentStepIndex: Int
    public var finalConclusion: String?
    public var errorMessage: String?
    public var followUps: [String]
    public var createdAt: Date

    public init(
        id: String = UUID().uuidString,
        sessionId: String,
        goal: String,
        status: DevOpsMissionStatus = .planning,
        isAutonomous: Bool = true,
        steps: [DevOpsStep] = [],
        currentStepIndex: Int = 0,
        finalConclusion: String? = nil,
        errorMessage: String? = nil,
        followUps: [String] = [],
        createdAt: Date = Date()
    ) {
        self.id = id
        self.sessionId = sessionId
        self.goal = goal
        self.status = status
        self.isAutonomous = isAutonomous
        self.steps = steps
        self.currentStepIndex = currentStepIndex
        self.finalConclusion = finalConclusion
        self.errorMessage = errorMessage
        self.followUps = followUps
        self.createdAt = createdAt
    }
}
