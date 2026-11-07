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
                "deviceId": deviceID, "expiresAt": ScreenTimeState.expiresAt * 1000,
                "sessionId": ScreenTimeState.sessionID ?? "", "configured": true]
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
        DispatchQueue.main.async {
            guard self.ready(call) else { return }
            guard AuthorizationCenter.shared.authorizationStatus == .approved,
                  let presenter = self.bridge?.viewController, !self.pickerOpen,
                  ScreenTimeState.expiresAt <= Date().timeIntervalSince1970 else {
                call.reject("Appval kräver godkännande och ett avslutat tidsfönster."); return
            }
            self.pickerOpen = true
            let view = GameRunAppPicker(initial: ScreenTimeState.selection) { selection in
                defer { self.pickerOpen = false }
                if let selection = selection, let data = try? JSONEncoder().encode(selection) {
                    ScreenTimeState.defaults?.set(data, forKey: "selection")
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
            guard AuthorizationCenter.shared.authorizationStatus == .approved, ScreenTimeState.count > 0,
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
    let finish: (FamilyActivitySelection?) -> Void
    init(initial: FamilyActivitySelection, finish: @escaping (FamilyActivitySelection?) -> Void) {
        _selection = State(initialValue: initial); self.finish = finish
    }
    var body: some View {
        NavigationStack {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Appar och webbplatser")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Avbryt") { finish(nil) } }
                    ToolbarItem(placement: .confirmationAction) { Button("Spara") { finish(selection) } }
                }
        }
    }
}