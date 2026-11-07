import Capacitor
import CoreMotion

@objc(GameRunMotionPlugin)
public class GameRunMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameRunMotionPlugin"
    public let jsName = "GameRunMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private let pedometer = CMPedometer()
    private var sessionId: String?

    @objc func start(_ call: CAPPluginCall) {
        guard let id = call.getString("sessionId"), let milliseconds = call.getDouble("startedAt") else {
            call.reject("Missing session start")
            return
        }
        // iOS terminates an app requesting motion without its privacy description.
        guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSMotionUsageDescription") as? String,
              !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("NSMotionUsageDescription is missing from Info.plist")
            return
        }
        guard CMPedometer.isStepCountingAvailable() else {
            call.reject("Step counting is unavailable")
            return
        }
        let status = CMPedometer.authorizationStatus()
        guard status != .denied && status != .restricted else {
            call.reject("Motion access is denied")
            return
        }
        DispatchQueue.main.async {
            self.pedometer.stopUpdates()
            self.sessionId = id
            self.pedometer.startUpdates(from: Date(timeIntervalSince1970: milliseconds / 1000)) { [weak self] data, error in
                DispatchQueue.main.async {
                    guard let self = self, self.sessionId == id else { return }
                    if let error = error {
                        self.notifyListeners("motionError", data: ["sessionId": id, "message": error.localizedDescription])
                        self.pedometer.stopUpdates()
                        self.sessionId = nil
                        return
                    }
                    guard let data = data else { return }
                    var payload: [String: Any] = ["sessionId": id, "steps": data.numberOfSteps.intValue]
                    if let distance = data.distance { payload["distance"] = distance.doubleValue }
                    self.notifyListeners("motionUpdate", data: payload)
                }
            }
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // An old screen's cleanup must not stop a newer pass.
            if self.sessionId == call.getString("sessionId") {
                self.pedometer.stopUpdates()
                self.sessionId = nil
            }
            call.resolve()
        }
    }

    deinit { pedometer.stopUpdates() }
}