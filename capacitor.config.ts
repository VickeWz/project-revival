import type { CapacitorConfig } from "@capacitor/cli";

// The app is bundled inside the iPhone app (no web address).
// Build it with `npm run build:native` before `npx cap sync ios` (or run `npm run ios`).
const config: CapacitorConfig = {
  appId: "com.axel.gamerun",
  appName: "GameRun",
  webDir: "native-dist",
  ios: { contentInset: "never" },
};

export default config;
