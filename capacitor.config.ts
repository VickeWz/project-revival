import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.axel.gamerun",
  appName: "GameRun",
  webDir: "dist",
  server: {
    url: "https://second-life-project-archive.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
