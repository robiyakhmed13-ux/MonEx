import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.robiyakhmedova.monex",
  appName: "MonEx",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    url: "https://e626c65e-40f4-494a-9450-45d853fe76ae.monex.com?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
