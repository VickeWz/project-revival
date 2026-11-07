import type { CapacitorConfig } from '@capacitor/cli';

// The iPhone app loads the live GameRun web app; HealthKit runs natively via @capgo/capacitor-health.
const config: CapacitorConfig = {
  appId: 'app.gamerun',
  appName: 'GameRun',
  webDir: 'public',
  server: {
    url: 'https://id-preview--d5122d93-14c9-4dff-8210-2e016359d91b.lovable.app',
    cleartext: false,
  },
};

export default config;
