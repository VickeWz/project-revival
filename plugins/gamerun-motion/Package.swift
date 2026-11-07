// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GameRunMotion",
    platforms: [.iOS(.v15)],
    products: [.library(name: "GameRunMotion", targets: ["GameRunMotionPlugin"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")],
    targets: [.target(
        name: "GameRunMotionPlugin",
        dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")],
        path: "ios/Sources/GameRunMotionPlugin",
        linkerSettings: [.linkedFramework("CoreMotion")]
    )]
)