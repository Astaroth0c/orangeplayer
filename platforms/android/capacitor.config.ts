import { CapacitorConfig } from "@capacitor/cli";

// URL do servidor Next.js. Em produção, substitua pelo seu domio público.
// Exemplos: "https://app.orangeplayer.example.com" ou "http://192.168.0.10:3000"
const SERVER_URL =
  process.env.ORANGE_SERVER_URL || "http://10.0.2.2:3000"; // 10.0.2.2 = host loopback no emulador Android

const config: CapacitorConfig = {
  appId: "com.orangeplayer.app",
  appName: "ORANGE Player",
  webDir: "android/app/src/main/assets/public",
  server: {
    url: SERVER_URL,
    cleartext: true,
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#101419",
    webContentsDebuggingEnabled: true,
    captureInput: true,
    initialIsAnchor: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#101419",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#FF781F",
    },
    StatusBar: {
      backgroundColor: "#101419",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;
