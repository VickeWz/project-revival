import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

// Compile this file into BOTH the app plugin and the monitor extension.
public enum ScreenTimeState {
    public static let group = "group.com.axel.gamerun"
    public static let store = ManagedSettingsStore(named: .init("gamerun"))
    public static var defaults: UserDefaults? { UserDefaults(suiteName: group) }
    public static var selection: FamilyActivitySelection {
        guard let data = defaults?.data(forKey: "selection"),
              let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else {
            return FamilyActivitySelection()
        }
        return value
    }
    public static var count: Int {
        let s = selection
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }
    public static var expiresAt: Double { defaults?.double(forKey: "expiresAt") ?? 0 }
    public static var sessionID: String? { defaults?.string(forKey: "sessionID") }
    public static func block() {
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