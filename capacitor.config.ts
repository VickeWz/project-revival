import type { CapacitorConfig } from '@capacitor/cli';

// The iPhone app loads the live GameRun web app; HealthKit runs natively via @capgo/capacitor-health.
const config: CapacitorConfig = {
  appId: 'app.gamerun',
  appName: 'GameRun',
  webDir: 'public',
  server: {
    url: 'https://second-life-project-archive.lovable.app',
    cleartext: false,
  },
};

export default config;
