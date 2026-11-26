import DeviceActivity
import Foundation

// Add to a Device Activity Monitor extension target, NOT to the app target.
// Three kinds of activity: "gamerun.<session UUID>" (unlock window), "gamerun.downtime.*"
// (daily downtime) and "gamerun.limits" (daily app limits with one event per limit).
class GameRunActivityMonitor: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        if activity == ScreenTimeState.limitsActivity {
            ScreenTimeState.resetLimits()
        } else if ScreenTimeState.isDowntimeActivity(activity) {
            // Daily schedule: enforceDowntime checks the weekday and does nothing on other days.
            ScreenTimeState.enforceDowntime()
        } else {
            ScreenTimeState.reconcile()
        }
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        if activity == ScreenTimeState.limitsActivity {
            ScreenTimeState.resetLimits()
            return
        }
        if ScreenTimeState.isDowntimeActivity(activity) {
            // Stays locked unless an unlock window is still running, which the server prevents.
            ScreenTimeState.reconcile()
            return
        }
        guard activity.rawValue == "gamerun.\(ScreenTimeState.sessionID ?? "")" else { return }
        // Stopping an old monitor can invoke this early; don't block a newer window.
        guard Date().timeIntervalSince1970 >= ScreenTimeState.expiresAt - 1 else { return }
        ScreenTimeState.block()
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        guard activity == ScreenTimeState.limitsActivity, event.rawValue.hasPrefix("limit.") else { return }
        ScreenTimeState.limitReached(String(event.rawValue.dropFirst("limit.".count)))
    }
}
