import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.robiyakhmedova.monex",
  appName: "MonEx",
  webDir: "dist",
  android: {
    buildOptions: {
      keystorePath: "release-key.keystore",
      keystoreAlias: "monex",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
  },
};

export default config;
