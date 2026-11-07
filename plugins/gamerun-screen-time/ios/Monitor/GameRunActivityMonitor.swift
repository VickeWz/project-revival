import DeviceActivity
import Foundation

// Add to a Device Activity Monitor extension target, NOT to the app target.
class GameRunActivityMonitor: DeviceActivityMonitor {
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard activity.rawValue == "gamerun.\(ScreenTimeState.sessionID ?? "")" else { return }
        // Stopping an old monitor can invoke this early; don't block a newer window.
        guard Date().timeIntervalSince1970 >= ScreenTimeState.expiresAt - 1 else { return }
        ScreenTimeState.block()
    }
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        ScreenTimeState.reconcile()
    }
}