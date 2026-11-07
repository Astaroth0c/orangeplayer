# ProGuard / R8 rules for the ORANGE Player Android wrapper (Capacitor 6).
#
# Capacitor ships its own consumer-rules.pro with the androidx/webkit/capacitor
# artifacts, so most WebView + bridge reflection is already preserved. This
# file adds belt-and-suspenders keeps that are commonly needed when bundling
# third-party HTTP / media libraries.

# --- Keep Capacitor's Bridge + plugin entry points ---
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * implements com.getcapacitor.PluginHandle { *; }

# --- Keep WebView / Chromium JS bridge classes ---
-keep class android.webkit.** { *; }
-keep class org.chromium.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Keep annotation-driven reflection (many media libs use this) ---
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,Signature,InnerClasses,EnclosingMethod

# --- Kotlin / Coroutines (used by Capacitor plugins) ---
-keep class kotlin.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# --- JS interop: keep any class whose name starts with the app namespace ---
-keep class com.orangeplayer.app.** { *; }

# --- HLS.js / video: don't strip anything the WebView might reflect into ---
-keep class * extends android.webkit.WebView { *; }
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.webkit.WebChromeClient { *; }

# --- Common third-party libs that ship without consumer rules ---
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**

# --- Strip debugging noise from release builds ---
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
}
