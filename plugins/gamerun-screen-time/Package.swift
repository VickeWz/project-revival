// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "GamerunCapacitorScreenTime",
    platforms: [.iOS(.v16)],
    products: [.library(name: "GamerunCapacitorScreenTime", targets: ["GameRunScreenTimePlugin"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")],
    targets: [.target(name: "GameRunScreenTimePlugin",
        dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")],
        path: "ios/Sources/GameRunScreenTimePlugin",
        linkerSettings: [.linkedFramework("FamilyControls"), .linkedFramework("ManagedSettings"), .linkedFramework("DeviceActivity")])]
)