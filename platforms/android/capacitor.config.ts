import { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the ORANGE Player Android wrapper.
 *
 * The Next.js web app is statically exported into ../../out (see the root
 * next.config.ts -> output: 'export') and served from a local file URL inside
 * the WebView. Mixed content is allowed because many IPTV streams are served
 * over plain http://.
 *
 * For "remote PWA mode" (Option A in the README), replace the `server` block
 * with:
 *
 *   server: {
 *     url: 'https://app.orangeplayer.example.com',
 *     cleartext: true,
 *     androidScheme: 'https',
 *   }
 *
 * and the APK will load the live hosted app instead of the bundled static
 * export.
 */
const config: CapacitorConfig = {
  appId: 'com.orangeplayer.app',
  appName: 'ORANGE Player',
  webDir: '../../out', // Next.js static export output (my-project/out)

  server: {
    androidScheme: 'https',
    // For an embedded local HTTP API server (Option B in README), uncomment:
    // hostname: '127.0.0.1',
    // port: 8080,
    // androidScheme: 'http',
  },

  android: {
    allowMixedContent: true, // IPTV streams are frequently http://
    backgroundColor: '#101419',
    // Enable WebView debugging in dev — flip to false for production builds.
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#101419',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#FF781F',
    },
    CapacitorHttp: {
      enabled: true, // Allow HTTP (not just HTTPS) for IPTV streams
    },
  },
};

export default config;
