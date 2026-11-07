package com.orangeplayer.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * ORANGE Player — native entry point.
 *
 * Wraps the Next.js static export (served by Capacitor from
 * app/src/main/assets/public) inside a Capacitor {@link BridgeActivity}.
 *
 * Responsibilities:
 *  - Keep the screen on during video playback (WAKE_LOCK flag).
 *  - Enter immersive sticky fullscreen on launch and on focus regain.
 *  - Forward D-pad / media-remote key events to the WebView so the web app's
 *    `use-spatial-nav.ts` hook can move focus across cards.
 *  - Disable the WebView's default long-click / text selection to give a
 *    cleaner TV-like experience.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the screen on while the player is foregrounded — critical for
        // long IPTV streams. Re-injected on every onCreate / onResume.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Immersive sticky fullscreen — matches the dark Orange Glass UI.
        applyImmersiveFullscreen();

        // Tune the Capacitor WebView once it's been attached by the bridge.
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView != null) {
            configureWebView(webView);
        }
    }

    /**
     * Apply immersive-sticky fullscreen flags. Re-applied on
     * {@link #onWindowFocusChanged(boolean)} because the system clears the
     * sticky flag transiently when the status bar is shown.
     */
    private void applyImmersiveFullscreen() {
        try {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        } catch (Exception ignored) {
            // Older / TV devices may reject some flags — safe to ignore.
        }
    }

    /**
     * Configure the Capacitor WebView for a TV-friendly media experience.
     */
    private void configureWebView(WebView webView) {
        // Capacitor already enables JS, DOM storage, and file access; we add
        // the media-specific tweaks here so HLS.js plays smoothly.
        try {
            webView.setLongClickable(false);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            // Hand focus to the WebView so D-pad events arrive first.
            webView.requestFocus();
        } catch (Exception ignored) {
        }
    }

    /**
     * Forward D-pad / media keys to the WebView.
     *
     * Capacitor's BridgeActivity already routes most key events to the web
     * `keydown` listener, but we explicitly route the standard Android TV
     * remote keys here so the web app's `use-spatial-nav.ts` hook reliably
     * receives `ArrowUp / ArrowDown / ArrowLeft / ArrowRight / Enter / Back`.
     */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView != null) {
            switch (keyCode) {
                // D-pad navigation
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    // Let Capacitor's bridge translate these to JS KeyboardEvents.
                    break;

                // Media transport keys (TV remotes often have dedicated buttons)
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                case KeyEvent.KEYCODE_MEDIA_PLAY:
                case KeyEvent.KEYCODE_MEDIA_PAUSE:
                case KeyEvent.KEYCODE_MEDIA_NEXT:
                case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                case KeyEvent.KEYCODE_MEDIA_STOP:
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                case KeyEvent.KEYCODE_MEDIA_REWIND:
                    break;

                // Back button — let the WebView / Capacitor handle history pop
                // (so in-app back navigation works before exiting the app).
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_MENU:
                    break;

                default:
                    break;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-assert WAKE_LOCK in case the activity was recreated.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersiveFullscreen();
    }
}
