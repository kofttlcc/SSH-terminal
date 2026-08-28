// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ITGeekTerminal",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "ITGeekTerminal",
            targets: ["ITGeekTerminal"]
        )
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "ITGeekTerminal",
            dependencies: [],
            path: "Sources/ITGeekTerminal",
            resources: [
                .copy("Resources/terminal_bundle")
            ]
        )
    ]
)
