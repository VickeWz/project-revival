import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

// Compile this file into BOTH the app plugin and the monitor extension.
public enum ScreenTimeState {
    public static let group = "group.com.axel.gamerun"
    /// Shields only. unblock() clears this store, so never put other restrictions in it.
    public static let store = ManagedSettingsStore(named: .init("gamerun"))
    /// Apps whose daily limit is used up. Never cleared by unblock(), so limits also apply while unlocked.
    public static let limitsStore = ManagedSettingsStore(named: .init("gamerun.limits"))
    public static let limitsActivity = DeviceActivityName("gamerun.limits")
    public static var defaults: UserDefaults? { UserDefaults(suiteName: group) }

    /// "all": everything is shielded except the always-allowed apps and websites (default).
    /// "selected": only the chosen apps, categories and websites are shielded.
    public enum LockMode: String { case all, selected }

    public static var lockMode: LockMode {
        LockMode(rawValue: defaults?.string(forKey: "lockMode") ?? "") ?? .all
    }

    private static func load<T: Decodable>(_ type: T.Type, _ key: String) -> T? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
    private static func save<T: Encodable>(_ value: T, _ key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults?.set(data, forKey: key) }
    }

    /// Apps, categories and websites to shield in the "selected" mode.
    public static var selection: FamilyActivitySelection { load(FamilyActivitySelection.self, "selection") ?? FamilyActivitySelection() }
    /// Apps and websites that stay open in the "all" mode and during downtime.
    public static var allowedSelection: FamilyActivitySelection { load(FamilyActivitySelection.self, "allowedSelection") ?? FamilyActivitySelection() }
    public static func saveSelection(_ value: FamilyActivitySelection, forKey key: String) { save(value, key) }

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

    /// Unlock windows are named "gamerun.<session UUID>"; downtime and limits use other names.
    public static func isSessionActivity(_ name: DeviceActivityName) -> Bool {
        let raw = name.rawValue
        return raw.hasPrefix("gamerun.") && UUID(uuidString: String(raw.dropFirst("gamerun.".count))) != nil
    }
    public static func isDowntimeActivity(_ name: DeviceActivityName) -> Bool {
        name.rawValue.hasPrefix("gamerun.downtime.")
    }

    // MARK: - Shields

    /// `downtime` overrides the computed state, e.g. when a downtime callback arrives a moment early.
    public static func block(downtime: Bool? = nil) {
        let wholePhone = lockMode == .all || (downtime ?? inDowntime)
        guard wholePhone, !allowedSelection.applicationTokens.isEmpty else {
            // "selected" mode, or no allowed app yet: keep the per-selection shields so
            // nothing opens more than before and GameRun is never shielded by accident.
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
        let downtime = inDowntime
        if expiresAt > Date().timeIntervalSince1970 && !downtime { return }
        if downtime { endUnlockWindow() }
        block(downtime: downtime)
    }

    /// Downtime ends an unlock window on the phone. The server never lets a window reach into downtime.
    private static func endUnlockWindow() {
        let now = Date().timeIntervalSince1970
        if expiresAt > now { defaults?.set(now, forKey: "expiresAt") }
    }

    // MARK: - Skärmfri tid (downtime)

    /// One downtime rule. Weekdays use Calendar numbering (1 = Sunday … 7 = Saturday) for the day
    /// it starts; start and end are minutes after midnight, and end <= start ends the next morning.
    public struct Downtime: Codable, Equatable {
        public let weekdays: [Int]
        public let start: Int
        public let end: Int

        public var minutes: Int { end > start ? end - start : 24 * 60 - start + end }
        /// Apple's DeviceActivity intervals must be at least 15 minutes.
        public var isValid: Bool {
            !weekdays.isEmpty && weekdays.allSatisfy { (1...7).contains($0) }
                && (0..<1440).contains(start) && (0..<1440).contains(end) && start != end && minutes >= 15
        }
    }

    public static var downtimes: [Downtime] { load([Downtime].self, "downtimes") ?? [] }
    public static func saveDowntimes(_ rules: [Downtime]) { save(rules, "downtimes") }

    private static func time(_ minutes: Int, on day: Date, _ calendar: Calendar) -> Date? {
        calendar.date(bySettingHour: minutes / 60, minute: minutes % 60, second: 0, of: day)
    }

    /// When the downtime that covers `date` ends, or nil when no downtime is active.
    public static func downtimeEnd(at date: Date = Date()) -> Date? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: date)
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: today) else { return nil }
        var latest: Date?
        for rule in downtimes {
            for startDay in [yesterday, today] where rule.weekdays.contains(calendar.component(.weekday, from: startDay)) {
                let endDay = rule.end > rule.start ? startDay : (calendar.date(byAdding: .day, value: 1, to: startDay) ?? startDay)
                guard let start = time(rule.start, on: startDay, calendar),
                      let end = time(rule.end, on: endDay, calendar),
                      start <= date, date < end else { continue }
                latest = max(latest ?? end, end)
            }
        }
        return latest
    }

    /// The next time a downtime starts after `date`, looking one week ahead.
    public static func nextDowntimeStart(after date: Date = Date()) -> Date? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: date)
        var next: Date?
        for offset in 0...7 {
            guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { continue }
            let weekday = calendar.component(.weekday, from: day)
            for rule in downtimes where rule.weekdays.contains(weekday) {
                guard let start = time(rule.start, on: day, calendar), start > date else { continue }
                next = min(next ?? start, start)
            }
        }
        return next
    }

    public static var inDowntime: Bool { downtimeEnd() != nil }

    /// Called when a downtime interval starts. iOS may call slightly early, so look a minute ahead.
    public static func enforceDowntime() {
        guard downtimeEnd(at: Date().addingTimeInterval(60)) != nil else { return }
        endUnlockWindow()
        block(downtime: true)
    }

    // MARK: - Appgränser (daily limits)

    public struct AppLimit: Codable, Equatable {
        public let id: String
        public let minutes: Int
        public var isValid: Bool { !id.isEmpty && id.count <= 64 && (1...1440).contains(minutes) }
    }

    public static var limits: [AppLimit] { load([AppLimit].self, "limits") ?? [] }
    public static func saveLimits(_ value: [AppLimit]) {
        save(value, "limits")
        let keep = Set(value.map { $0.id })
        save(limitSelections.filter { keep.contains($0.key) }, "limitSelections")
    }
    public static var limitSelections: [String: FamilyActivitySelection] {
        load([String: FamilyActivitySelection].self, "limitSelections") ?? [:]
    }
    public static func saveLimitSelection(_ value: FamilyActivitySelection, for id: String) {
        var all = limitSelections
        all[id] = value
        save(all, "limitSelections")
    }
    public static func selectionCount(for id: String) -> Int {
        guard let s = limitSelections[id] else { return 0 }
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }

    /// Limits used up today. Stored with the day so a missed midnight reset cannot carry over.
    public static var limitsReachedToday: [String] {
        let today = Calendar.current.startOfDay(for: Date()).timeIntervalSince1970
        guard defaults?.double(forKey: "limitsDay") == today else { return [] }
        return defaults?.stringArray(forKey: "limitsReached") ?? []
    }

    public static func limitReached(_ id: String) {
        let today = Calendar.current.startOfDay(for: Date()).timeIntervalSince1970
        var reached = limitsReachedToday
        if !reached.contains(id) { reached.append(id) }
        defaults?.set(today, forKey: "limitsDay")
        defaults?.set(reached, forKey: "limitsReached")
        applyLimitShields()
    }

    /// Shields the apps of every limit used up today (and only limits that still exist).
    public static func applyLimitShields() {
        let selections = limitSelections
        let current = Set(limits.map { $0.id })
        var apps = Set<ApplicationToken>()
        var categories = Set<ActivityCategoryToken>()
        var webDomains = Set<WebDomainToken>()
        for id in limitsReachedToday where current.contains(id) {
            guard let s = selections[id] else { continue }
            apps.formUnion(s.applicationTokens)
            categories.formUnion(s.categoryTokens)
            webDomains.formUnion(s.webDomainTokens)
        }
        limitsStore.shield.applications = apps.isEmpty ? nil : apps
        limitsStore.shield.applicationCategories = categories.isEmpty ? nil : .specific(categories)
        limitsStore.shield.webDomains = webDomains.isEmpty ? nil : webDomains
        limitsStore.shield.webDomainCategories = categories.isEmpty ? nil : .specific(categories)
    }

    /// A new day: every limit starts from zero.
    public static func resetLimits() {
        defaults?.removeObject(forKey: "limitsReached")
        defaults?.removeObject(forKey: "limitsDay")
        limitsStore.clearAllSettings()
    }
}
