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
    // Håller appen inne i appen istället för att öppna Safari.
    allowNavigation: ["second-life-project-archive.lovable.app"],
  },
};

export default config;
