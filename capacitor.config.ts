import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.axel.gamerun",
  appName: "GameRun",
  // Appen laddas från server.url nedan; den här mappen är bara en
  // platshållare så att `cap sync` hittar en index.html.
  webDir: "capacitor-web",
  server: {
    url: "https://second-life-project-archive.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
