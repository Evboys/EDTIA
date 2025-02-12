import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'visionapp',
  webDir: 'build',
  server: {
    allowNavigation: ['https://progpedammi.iut-tlse3.fr']
  }
};

export default config;
