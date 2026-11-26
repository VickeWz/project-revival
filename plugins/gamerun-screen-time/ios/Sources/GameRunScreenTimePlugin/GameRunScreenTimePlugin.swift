import Capacitor
import FamilyControls
import DeviceActivity
import ManagedSettings
import SwiftUI

@objc(GameRunScreenTimePlugin)
public class GameRunScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameRunScreenTimePlugin"
    public let jsName = "GameRunScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectAllowedApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLockMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDowntime", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLimits", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectLimitApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise)
    ]
    private var pickerOpen = false
    private func ready(_ call: CAPPluginCall) -> Bool {
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ScreenTimeState.group) != nil else {
            call.reject("App Groups saknas i signeringen (\(ScreenTimeState.group)). Se iPhone-guiden, steg 2."); return false
        }
        if let problem = monitorProblem() {
            call.reject("Skärmtidstillägget är inte installerat: \(problem)"); return false
        }
        return true
    }
    /// Info.plist values added in Xcode's Info tab default to String, so accept YES/true as text too.
    private func flag(_ value: Any?) -> Bool {
        if let bool = value as? Bool { return bool }
        if let text = value as? String { return ["yes", "true", "1"].contains(text.lowercased()) }
        if let number = value as? NSNumber { return number.boolValue }
        return false
    }
    /// Says exactly which part of the monitor setup is missing, so it can be fixed in Xcode.
    private func monitorProblem() -> String? {
        guard flag(Bundle.main.object(forInfoDictionaryKey: "GameRunMonitorConfigured")) else {
            return "appens Info saknar raden GameRunMonitorConfigured = YES (target App → Info)."
        }
        let folders = [Bundle.main.builtInPlugInsURL, Bundle.main.bundleURL.appendingPathComponent("Extensions")].compactMap { $0 }
        let extensions = folders
            .flatMap { (try? FileManager.default.contentsOfDirectory(at: $0, includingPropertiesForKeys: nil)) ?? [] }
            .filter { $0.pathExtension == "appex" }
        guard !extensions.isEmpty else {
            return "inget tillägg är inbäddat i appen (target App → Build Phases → Embed Foundation Extensions ska innehålla GameRunMonitor.appex)."
        }
        guard extensions.contains(where: { flag(Bundle(url: $0)?.object(forInfoDictionaryKey: "GameRunMonitor")) }) else {
            let names = extensions.map { $0.lastPathComponent }.joined(separator: ", ")
            return "tillägget (\(names)) saknar raden GameRunMonitor = YES (target GameRunMonitor → Info)."
        }
        return nil
    }
    private func millis(_ date: Date?) -> Double { (date?.timeIntervalSince1970 ?? 0) * 1000 }
    private func payload() -> [String: Any] {
        let d = ScreenTimeState.defaults
        let deviceID = d?.string(forKey: "deviceID") ?? UUID().uuidString
        d?.set(deviceID, forKey: "deviceID")
        let a = AuthorizationCenter.shared.authorizationStatus
        let reached = Set(ScreenTimeState.limitsReachedToday)
        let limits: [[String: Any]] = ScreenTimeState.limits.map { limit in
            ["id": limit.id, "minutes": limit.minutes,
             "selectionCount": ScreenTimeState.selectionCount(for: limit.id), "reached": reached.contains(limit.id)]
        }
        return ["authorized": a == .approved, "selectionCount": ScreenTimeState.count,
                "lockMode": ScreenTimeState.lockMode.rawValue,
                "allowedCount": ScreenTimeState.allowedCount, "blockedCount": ScreenTimeState.count,
                "needsAllowedApps": ScreenTimeState.needsAllowedApps,
                "downtimeActive": ScreenTimeState.inDowntime,
                "downtimeEndsAt": millis(ScreenTimeState.downtimeEnd()),
                "nextDowntimeAt": millis(ScreenTimeState.nextDowntimeStart()),
                "limits": limits,
                // Exactly what JS last sent, so it can skip unchanged rules (restarting limits resets usage).
                "downtimeJson": d?.string(forKey: "downtimeJson") ?? "",
                "limitsJson": d?.string(forKey: "limitsJson") ?? "",
                "deviceId": deviceID, "expiresAt": ScreenTimeState.expiresAt * 1000,
                "sessionId": ScreenTimeState.sessionID ?? "", "configured": true]
    }
    private func approved(_ call: CAPPluginCall) -> Bool {
        guard AuthorizationCenter.shared.authorizationStatus == .approved else {
            call.reject("Godkänn skärmtid med förälder först."); return false
        }
        return true
    }
    /// Lock settings may only change between unlock windows, never while apps are open.
    private func canChangeLock(_ call: CAPPluginCall) -> Bool {
        guard AuthorizationCenter.shared.authorizationStatus == .approved,
              ScreenTimeState.expiresAt <= Date().timeIntervalSince1970 else {
            call.reject("Appval kräver godkännande och ett avslutat tidsfönster."); return false
        }
        return true
    }
    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call) else { return }
            if AuthorizationCenter.shared.authorizationStatus == .approved {
                ScreenTimeState.reconcile()
                ScreenTimeState.applyLimitShields()
            }
            call.resolve(self.payload())
        }
    }
    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call) else { return }
            Task { @MainActor in
                do {
                    // Child authorization requires guardian approval in Apple Family Sharing.
                    try await AuthorizationCenter.shared.requestAuthorization(for: .child)
                    ScreenTimeState.reconcile()
                    call.resolve(self.payload())
                } catch { call.reject("Förälderns godkännande för skärmtid kunde inte slutföras.") }
            }
        }
    }

    // MARK: - App choices and lock mode

    @objc func selectApps(_ call: CAPPluginCall) {
        presentPicker(call, title: "Appar som spärras", note: "Används i läget Valda appar. Välj inte GameRun.",
                      initial: ScreenTimeState.selection) { selection in
            ScreenTimeState.saveSelection(selection, forKey: "selection")
            ScreenTimeState.reconcile()
        }
    }
    @objc func selectAllowedApps(_ call: CAPPluginCall) {
        presentPicker(call, title: "Alltid tillåtna",
                      note: "Välj GameRun och de appar som alltid ska fungera, till exempel Telefon och Meddelanden. Välj enskilda appar, inte kategorier.",
                      initial: ScreenTimeState.allowedSelection) { selection in
            ScreenTimeState.saveSelection(selection, forKey: "allowedSelection")
            ScreenTimeState.reconcile()
        }
    }
    @objc func selectLimitApps(_ call: CAPPluginCall) {
        guard let id = call.getString("limitId"), !id.isEmpty, id.count <= 64 else {
            call.reject("Okänd appgräns."); return
        }
        let name = call.getString("name") ?? "Appgräns"
        presentPicker(call, title: name, note: "Välj de appar och kategorier som gränsen ska gälla. Användningen räknas om från noll när valet sparas.",
                      initial: ScreenTimeState.limitSelections[id] ?? FamilyActivitySelection()) { selection in
            ScreenTimeState.saveLimitSelection(selection, for: id)
            try? self.restartLimitMonitoring()
        }
    }
    @objc func setLockMode(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call), self.canChangeLock(call) else { return }
            guard let raw = call.getString("mode"), let mode = ScreenTimeState.LockMode(rawValue: raw) else {
                call.reject("Okänt låsläge."); return
            }
            ScreenTimeState.defaults?.set(mode.rawValue, forKey: "lockMode")
            ScreenTimeState.reconcile()
            call.resolve(self.payload())
        }
    }
    private func presentPicker(_ call: CAPPluginCall, title: String, note: String, initial: FamilyActivitySelection,
                               save: @escaping (FamilyActivitySelection) -> Void) {
        DispatchQueue.main.async {
            guard self.ready(call), self.canChangeLock(call) else { return }
            guard let presenter = self.bridge?.viewController, !self.pickerOpen else {
                call.reject("Appväljaren är redan öppen."); return
            }
            self.pickerOpen = true
            let view = GameRunAppPicker(initial: initial, title: title, note: note) { selection in
                defer { self.pickerOpen = false }
                if let selection = selection { save(selection) }
                presenter.dismiss(animated: true) { call.resolve(self.payload()) }
            }
            let controller = UIHostingController(rootView: view)
            controller.isModalInPresentation = true
            presenter.present(controller, animated: true)
        }
    }

    // MARK: - Skärmfri tid (downtime)

    /// Replaces all downtime rules. options.json = [{ weekdays: [1–7], start: minutes, end: minutes }].
    @objc func setDowntime(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call), self.approved(call) else { return }
            guard let json = call.getString("json"), let data = json.data(using: .utf8),
                  let rules = try? JSONDecoder().decode([ScreenTimeState.Downtime].self, from: data),
                  rules.count <= 8, rules.allSatisfy({ $0.isValid }) else {
                call.reject("Ogiltigt schema för skärmfri tid."); return
            }
            ScreenTimeState.saveDowntimes(rules)
            ScreenTimeState.defaults?.set(json, forKey: "downtimeJson")
            let center = DeviceActivityCenter()
            center.stopMonitoring(center.activities.filter { ScreenTimeState.isDowntimeActivity($0) })
            let failed = rules.enumerated().filter { !self.monitorDowntime($0.element, index: $0.offset, center: center) }.count
            // Downtime is also enforced from the saved rules whenever GameRun or the monitor runs.
            ScreenTimeState.reconcile()
            if failed > 0 { call.reject("iOS kunde inte schemalägga skärmfri tid. Den gäller när GameRun öppnas."); return }
            call.resolve(self.payload())
        }
    }
    private func monitorDowntime(_ rule: ScreenTimeState.Downtime, index: Int, center: DeviceActivityCenter) -> Bool {
        func at(_ minutes: Int) -> DateComponents { DateComponents(hour: minutes / 60, minute: minutes % 60) }
        do {
            try center.startMonitoring(DeviceActivityName("gamerun.downtime.\(index)"),
                                       during: DeviceActivitySchedule(intervalStart: at(rule.start), intervalEnd: at(rule.end), repeats: true))
            return true
        } catch {
            // If iOS rejects a daily interval across midnight, split it into evening and morning.
            guard rule.end < rule.start else { return false }
            var scheduled = false
            if 23 * 60 + 59 - rule.start >= 15,
               (try? center.startMonitoring(DeviceActivityName("gamerun.downtime.\(index).evening"),
                                            during: DeviceActivitySchedule(intervalStart: at(rule.start), intervalEnd: at(23 * 60 + 59), repeats: true))) != nil {
                scheduled = true
            }
            if rule.end >= 15,
               (try? center.startMonitoring(DeviceActivityName("gamerun.downtime.\(index).morning"),
                                            during: DeviceActivitySchedule(intervalStart: at(0), intervalEnd: at(rule.end), repeats: true))) != nil {
                scheduled = true
            }
            return scheduled
        }
    }

    // MARK: - Appgränser (daily limits)

    /// Replaces all limits. options.json = [{ id, minutes }]. Apps for each limit are chosen with selectLimitApps.
    /// Restarting the daily monitor resets today's usage, so only call this when the limits changed.
    @objc func setLimits(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call), self.approved(call) else { return }
            guard let json = call.getString("json"), let data = json.data(using: .utf8),
                  let limits = try? JSONDecoder().decode([ScreenTimeState.AppLimit].self, from: data),
                  limits.count <= 20, limits.allSatisfy({ $0.isValid }) else {
                call.reject("Ogiltiga appgränser."); return
            }
            ScreenTimeState.saveLimits(limits)
            ScreenTimeState.defaults?.set(json, forKey: "limitsJson")
            do {
                try self.restartLimitMonitoring()
                call.resolve(self.payload())
            } catch {
                call.reject("iOS kunde inte schemalägga appgränserna.")
            }
        }
    }
    private func restartLimitMonitoring() throws {
        let center = DeviceActivityCenter()
        center.stopMonitoring([ScreenTimeState.limitsActivity])
        ScreenTimeState.applyLimitShields()
        let selections = ScreenTimeState.limitSelections
        var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
        for limit in ScreenTimeState.limits {
            guard let s = selections[limit.id],
                  !(s.applicationTokens.isEmpty && s.categoryTokens.isEmpty && s.webDomainTokens.isEmpty) else { continue }
            events[DeviceActivityEvent.Name("limit.\(limit.id)")] = DeviceActivityEvent(
                applications: s.applicationTokens, categories: s.categoryTokens, webDomains: s.webDomainTokens,
                threshold: DateComponents(hour: limit.minutes / 60, minute: limit.minutes % 60))
        }
        guard !events.isEmpty else { return }
        try center.startMonitoring(ScreenTimeState.limitsActivity,
                                   during: DeviceActivitySchedule(intervalStart: DateComponents(hour: 0, minute: 0),
                                                                  intervalEnd: DateComponents(hour: 23, minute: 59), repeats: true),
                                   events: events)
    }

    // MARK: - Unlock with earned time

    @objc func activate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call) else { return }
            guard AuthorizationCenter.shared.authorizationStatus == .approved, ScreenTimeState.isConfigured,
                  let id = call.getString("sessionId"), UUID(uuidString: id) != nil,
                  let ms = call.getDouble("expiresAt"), ms.isFinite else {
                call.reject("Godkänn skärmtid och välj appar först."); return
            }
            let now = Date()
            let end = Date(timeIntervalSince1970: ms / 1000)
            guard end > now, end.timeIntervalSince(now) <= 180 * 60 + 5 else {
                ScreenTimeState.reconcile(); call.reject("Tidsfönstret har löpt ut."); return
            }
            guard !ScreenTimeState.inDowntime else {
                ScreenTimeState.reconcile(); call.reject("Skärmfri tid pågår."); return
            }
            if let next = ScreenTimeState.nextDowntimeStart(after: now), next < end.addingTimeInterval(-5) {
                call.reject("Upplåsningen skulle gå in i skärmfri tid."); return
            }
            let activity = DeviceActivityName("gamerun.\(id)")
            let center = DeviceActivityCenter()
            if ScreenTimeState.sessionID == id && center.activities.contains(activity) {
                ScreenTimeState.unblock(); call.resolve(self.payload()); return
            }
            guard ScreenTimeState.expiresAt <= now.timeIntervalSince1970 || ScreenTimeState.sessionID == id else {
                call.reject("Ett tidsfönster är redan aktivt."); return
            }
            // Apple's monitoring interval must be >=15m. Backdate its start, NOT
            // the access expiry. Short rewards still end at the server's timestamp.
            let start = now.addingTimeInterval(-16 * 60)
            let fields: Set<Calendar.Component> = [.era, .year, .month, .day, .hour, .minute, .second]
            let calendar = Calendar.current
            let schedule = DeviceActivitySchedule(
                intervalStart: calendar.dateComponents(fields, from: start),
                intervalEnd: calendar.dateComponents(fields, from: end), repeats: false)
            do {
                // Never lift shields until iOS accepted the monitoring schedule.
                try center.startMonitoring(activity, during: schedule)
                ScreenTimeState.defaults?.set(id, forKey: "sessionID")
                ScreenTimeState.defaults?.set(end.timeIntervalSince1970, forKey: "expiresAt")
                // Stop only older unlock windows; downtime and limits keep running.
                for old in center.activities where old != activity && ScreenTimeState.isSessionActivity(old) {
                    center.stopMonitoring([old])
                }
                ScreenTimeState.unblock()
                call.resolve(self.payload())
            } catch {
                ScreenTimeState.block()
                call.reject("iOS kunde inte schemalägga återblockeringen. Försök igen.")
            }
        }
    }
}

private struct GameRunAppPicker: View {
    @State var selection: FamilyActivitySelection
    let title: String
    let note: String
    let finish: (FamilyActivitySelection?) -> Void
    init(initial: FamilyActivitySelection, title: String, note: String, finish: @escaping (FamilyActivitySelection?) -> Void) {
        _selection = State(initialValue: initial); self.title = title; self.note = note; self.finish = finish
    }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Text(note)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                FamilyActivityPicker(selection: $selection)
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Avbryt") { finish(nil) } }
                ToolbarItem(placement: .confirmationAction) { Button("Spara") { finish(selection) } }
            }
        }
    }
}
