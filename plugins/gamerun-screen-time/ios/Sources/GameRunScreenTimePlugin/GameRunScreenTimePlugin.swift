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
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise)
    ]
    private var pickerOpen = false
    private func ready(_ call: CAPPluginCall) -> Bool {
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: ScreenTimeState.group) != nil else {
            call.reject("App Groups saknas i signeringen."); return false
        }
        guard Bundle.main.object(forInfoDictionaryKey: "GameRunMonitorConfigured") as? Bool == true,
              let plugins = Bundle.main.builtInPlugInsURL,
              let bundles = try? FileManager.default.contentsOfDirectory(at: plugins, includingPropertiesForKeys: nil),
              bundles.contains(where: { Bundle(url: $0)?.object(forInfoDictionaryKey: "GameRunMonitor") as? Bool == true }) else {
            call.reject("Skärmtidstillägget är inte installerat. Följ iPhone-guiden."); return false
        }
        return true
    }
    private func payload() -> [String: Any] {
        let d = ScreenTimeState.defaults
        let deviceID = d?.string(forKey: "deviceID") ?? UUID().uuidString
        d?.set(deviceID, forKey: "deviceID")
        let a = AuthorizationCenter.shared.authorizationStatus
        return ["authorized": a == .approved, "selectionCount": ScreenTimeState.count,
                "lockMode": ScreenTimeState.lockMode.rawValue,
                "allowedCount": ScreenTimeState.allowedCount, "blockedCount": ScreenTimeState.count,
                "needsAllowedApps": ScreenTimeState.needsAllowedApps,
                "deviceId": deviceID, "expiresAt": ScreenTimeState.expiresAt * 1000,
                "sessionId": ScreenTimeState.sessionID ?? "", "configured": true]
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
            if AuthorizationCenter.shared.authorizationStatus == .approved { ScreenTimeState.reconcile() }
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
    @objc func selectApps(_ call: CAPPluginCall) {
        presentPicker(call, key: "selection", title: "Appar som spärras",
                      note: "Används i läget Valda appar. Välj inte GameRun.")
    }
    @objc func selectAllowedApps(_ call: CAPPluginCall) {
        presentPicker(call, key: "allowedSelection", title: "Alltid tillåtna",
                      note: "Välj GameRun och de appar som alltid ska fungera, till exempel Telefon och Meddelanden. Välj enskilda appar, inte kategorier.")
    }
    @objc func setLockMode(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.ready(call), self.canChangeLock(call) else { return }
            guard let raw = call.getString("mode"), let mode = ScreenTimeState.LockMode(rawValue: raw) else {
                call.reject("Okänt låsläge."); return
            }
            ScreenTimeState.defaults?.set(mode.rawValue, forKey: "lockMode")
            ScreenTimeState.block()
            call.resolve(self.payload())
        }
    }
    private func presentPicker(_ call: CAPPluginCall, key: String, title: String, note: String) {
        DispatchQueue.main.async {
            guard self.ready(call), self.canChangeLock(call) else { return }
            guard let presenter = self.bridge?.viewController, !self.pickerOpen else {
                call.reject("Appväljaren är redan öppen."); return
            }
            self.pickerOpen = true
            let initial = key == "allowedSelection" ? ScreenTimeState.allowedSelection : ScreenTimeState.selection
            let view = GameRunAppPicker(initial: initial, title: title, note: note) { selection in
                defer { self.pickerOpen = false }
                if let selection = selection, let data = try? JSONEncoder().encode(selection) {
                    ScreenTimeState.defaults?.set(data, forKey: key)
                    ScreenTimeState.block()
                }
                presenter.dismiss(animated: true) { call.resolve(self.payload()) }
            }
            let controller = UIHostingController(rootView: view)
            controller.isModalInPresentation = true
            presenter.present(controller, animated: true)
        }
    }
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
                for old in center.activities where old != activity { center.stopMonitoring([old]) }
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
