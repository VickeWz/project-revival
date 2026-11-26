import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

// Compile this file into BOTH the app plugin and the monitor extension.
public enum ScreenTimeState {
    public static let group = "group.com.axel.gamerun"
    /// Shields only. unblock() clears this store, so never put other restrictions in it.
    public static let store = ManagedSettingsStore(named: .init("gamerun"))
    public static var defaults: UserDefaults? { UserDefaults(suiteName: group) }

    /// "all": everything is shielded except the always-allowed apps and websites (default).
    /// "selected": only the chosen apps, categories and websites are shielded.
    public enum LockMode: String { case all, selected }

    public static var lockMode: LockMode {
        LockMode(rawValue: defaults?.string(forKey: "lockMode") ?? "") ?? .all
    }

    private static func load(_ key: String) -> FamilyActivitySelection {
        guard let data = defaults?.data(forKey: key),
              let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else {
            return FamilyActivitySelection()
        }
        return value
    }

    /// Apps, categories and websites to shield in the "selected" mode.
    public static var selection: FamilyActivitySelection { load("selection") }
    /// Apps and websites that stay open in the "all" mode.
    public static var allowedSelection: FamilyActivitySelection { load("allowedSelection") }

    public static var count: Int {
        let s = selection
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }
    /// Categories cannot be exceptions to `.all(except:)`, so only apps and websites count.
    public static var allowedCount: Int {
        let a = allowedSelection
        return a.applicationTokens.count + a.webDomainTokens.count
    }
    /// The whole-phone lock waits until at least one app (GameRun) is allowed,
    /// so GameRun can never be shielded before a parent has chosen it.
    public static var needsAllowedApps: Bool {
        lockMode == .all && allowedSelection.applicationTokens.isEmpty
    }
    /// Whether there is anything to unlock: activation requires this.
    public static var isConfigured: Bool {
        lockMode == .all ? !needsAllowedApps : count > 0
    }

    public static var expiresAt: Double { defaults?.double(forKey: "expiresAt") ?? 0 }
    public static var sessionID: String? { defaults?.string(forKey: "sessionID") }

    public static func block() {
        guard lockMode == .all, !needsAllowedApps else {
            // "selected" mode, or "all" before any app is allowed: keep today's
            // per-selection shields so switching modes never opens more than before.
            blockSelected()
            return
        }
        let allowed = allowedSelection
        store.shield.applications = nil
        store.shield.webDomains = nil
        store.shield.applicationCategories = .all(except: allowed.applicationTokens)
        store.shield.webDomainCategories = .all(except: allowed.webDomainTokens)
    }

    private static func blockSelected() {
        let s = selection
        store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
        store.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        store.shield.webDomains = s.webDomainTokens.isEmpty ? nil : s.webDomainTokens
        store.shield.webDomainCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
    }

    public static func unblock() { store.clearAllSettings() }

    public static func reconcile() {
        if expiresAt > Date().timeIntervalSince1970 { return }
        block()
    }
}
