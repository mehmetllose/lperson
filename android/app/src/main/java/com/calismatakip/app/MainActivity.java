package com.calismatakip.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * Android 13+ requires a runtime POST_NOTIFICATIONS grant before the WebView
 * {@code Notification.requestPermission()} flow can succeed reliably.
 */
public class MainActivity extends BridgeActivity {

    public static final int REQ_POST_NOTIFICATIONS = 9911;
    public static final int REQ_CAMERA = 9912;
    public static final String EXTRA_WIDGET_QR = "lperson_widget_qr";

    private boolean openedFromWidgetQr = false;

    static boolean isQrWidgetIntent(Intent intent) {
        if (intent == null) return false;
        if (intent.getBooleanExtra(EXTRA_WIDGET_QR, false)) return true;
        Uri data = intent.getData();
        if (data == null) return false;
        String raw = data.toString();
        return "qr".equalsIgnoreCase(data.getHost())
                || raw.startsWith("lperson://qr")
                || raw.contains("action=qr");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        openedFromWidgetQr = isQrWidgetIntent(getIntent());
        if (openedFromWidgetQr) {
            setTheme(R.style.AppTheme_WidgetQrLaunch);
        } else {
            final SplashScreen splash = SplashScreen.installSplashScreen(this);
            final long splashAt = SystemClock.uptimeMillis();
            splash.setKeepOnScreenCondition(() -> SystemClock.uptimeMillis() - splashAt < 800);
        }
        super.onCreate(savedInstanceState);
        ensureShiftNotificationChannel();
        WebView wv = getBridge().getWebView();
        try {
            if (wv != null) {
                disableWebViewForceDark(wv);
                if (openedFromWidgetQr) {
                    wv.setBackgroundColor(Color.TRANSPARENT);
                    wv.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
                } else {
                    wv.setBackgroundColor(Color.parseColor("#0F0F0F"));
                }
                wv.addJavascriptInterface(new PermBridge(this), "AndroidPerm");
                wv.addJavascriptInterface(new WidgetBridge(this), "AndroidWidget");
                wv.addJavascriptInterface(new WidgetSessionBridge(this), "AndroidInlineStore");
                wv.addJavascriptInterface(new NotifyWatchBridge(this), "AndroidNotifyWatch");
                wv.addJavascriptInterface(new AppUpdater(this, wv), "AndroidUpdater");
                if (openedFromWidgetQr) {
                    wv.post(() -> deliverWidgetQr(wv));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private static void disableWebViewForceDark(WebView wv) {
        if (wv == null) return;
        try {
            WebSettings s = wv.getSettings();
            if (Build.VERSION.SDK_INT >= 33) {
                s.setAlgorithmicDarkeningAllowed(false);
            } else if (Build.VERSION.SDK_INT >= 29) {
                s.setForceDark(WebSettings.FORCE_DARK_OFF);
            }
        } catch (Exception ignored) {}
    }

    void applyThemeChrome(String bgHex, boolean light) {
        try {
            Window w = getWindow();
            if (w == null) return;
            int color;
            try {
                color = Color.parseColor(bgHex);
            } catch (Exception e) {
                color = light ? Color.parseColor("#E4E4E4") : Color.parseColor("#0F0F0F");
            }
            w.setStatusBarColor(color);
            w.setNavigationBarColor(color);
            if (Build.VERSION.SDK_INT >= 23) {
                View decor = w.getDecorView();
                int flags = decor.getSystemUiVisibility();
                if (light) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                else flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= 26) {
                    if (light) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    else flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decor.setSystemUiVisibility(flags);
            }
        } catch (Exception ignored) {}
    }

    private void ensureShiftNotificationChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel existing = nm.getNotificationChannel("ct_shift");
        if (existing != null && existing.getImportance() >= NotificationManager.IMPORTANCE_HIGH) return;
        if (existing != null) nm.deleteNotificationChannel("ct_shift");
        NotificationChannel ch = new NotificationChannel("ct_shift", "Vardiya ve işyeri", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Giriş, çıkış ve talepler");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onResume() {
        super.onResume();
        NotifyWatchService.appInForeground = true;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(71001);
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        NotifyWatchService.appInForeground = false;
        super.onPause();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (!isQrWidgetIntent(intent)) return;
        openedFromWidgetQr = true;
        WebView wv = getBridge().getWebView();
        if (wv != null) wv.post(() -> deliverWidgetQr(wv));
    }

    private void deliverWidgetQr(WebView wv) {
        if (wv == null) return;
        wv.evaluateJavascript(
                "(function(){try{document.documentElement.classList.add('widget-qr-launch');if(window.openQrFromHomeWidget)window.openQrFromHomeWidget();else window.__lpersonWidgetQrPending=true;}catch(e){}})()",
                null);
    }

    void runWebNotifPermissionContinuation() {
        WebView wv = getBridge().getWebView();
        if (wv == null) return;
        wv.post(
                () ->
                        wv.evaluateJavascript(
                                "(function(){try{var f=window.__onAndroidPostNotifResult;if(typeof f==='function'){window.__onAndroidPostNotifResult=null;f();}}catch(e){}})()",
                                null));
    }

    void promptPostNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT < 33) {
            runWebNotifPermissionContinuation();
            return;
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            runWebNotifPermissionContinuation();
            return;
        }
        ActivityCompat.requestPermissions(
                this, new String[] {Manifest.permission.POST_NOTIFICATIONS}, REQ_POST_NOTIFICATIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_POST_NOTIFICATIONS) {
            runWebNotifPermissionContinuation();
        }
        if (requestCode == REQ_CAMERA) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            String res = granted ? "granted"
                    : (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA) ? "denied" : "blocked");
            deliverCameraPermResult(res);
        }
    }

    void requestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            deliverCameraPermResult("granted");
            return;
        }
        ActivityCompat.requestPermissions(this, new String[] {Manifest.permission.CAMERA}, REQ_CAMERA);
    }

    void deliverCameraPermResult(String res) {
        WebView wv = getBridge().getWebView();
        if (wv == null) return;
        wv.post(() -> wv.evaluateJavascript(
                "(function(){try{var f=window.__onAndroidCameraPerm;window.__onAndroidCameraPerm=null;if(typeof f==='function')f('" + res + "');}catch(e){}})()", null));
    }

    void openAppSettings() {
        try {
            Intent i = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception ignored) {}
    }

    static class PermBridge {
        private final MainActivity activity;

        PermBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void requestPostNotifications() {
            activity.runOnUiThread(() -> activity.promptPostNotificationsIfNeeded());
        }

        @JavascriptInterface
        public void requestCamera() {
            activity.runOnUiThread(() -> activity.requestCameraPermission());
        }

        @JavascriptInterface
        public void openAppSettings() {
            activity.runOnUiThread(() -> activity.openAppSettings());
        }
    }

    static class WidgetBridge {
        private final MainActivity activity;

        WidgetBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void pinQrWidget() {
            activity.runOnUiThread(() ->
                    Toast.makeText(activity, "Ana ekrana uzun basın, Widgetler’den lPerson → Buradan Tara’yı ekleyin.", Toast.LENGTH_LONG).show());
        }

        @JavascriptInterface
        public void setQrHidden(boolean hidden) {
            QrInlineWidgetProvider.saveQrHidden(activity, hidden);
        }

        @JavascriptInterface
        public void setQrPrefs(String color, String label, String imageData) {
            QrInlineWidgetProvider.saveWidgetPreferences(activity, color, label, imageData);
        }

        @JavascriptInterface
        public void setQrFrames(String framesJson) {
            QrInlineWidgetProvider.saveVideoFrames(activity, framesJson);
        }

        @JavascriptInterface
        public void returnToHome() {
            activity.runOnUiThread(() -> {
                activity.openedFromWidgetQr = false;
                activity.moveTaskToBack(true);
            });
        }

        @JavascriptInterface
        public void playQrCue(boolean success) {
            QrCuePlayer.play(activity, success);
        }
    }

    static class NotifyWatchBridge {
        private final MainActivity activity;

        NotifyWatchBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void start() {
            NotifyWatchService.start(activity);
        }

        @JavascriptInterface
        public void stop() {
            NotifyWatchService.stop(activity);
        }

        @JavascriptInterface
        public boolean consumeRecent(String tag) {
            return NotifyWatchService.recentlyAlerted(tag);
        }

        @JavascriptInterface
        public void postAlert(String title, String body, String tag) {
            NotifyWatchService.notifyFromJs(activity.getApplicationContext(), title, body, tag);
        }

        @JavascriptInterface
        public void setTheme(String bg, String bg2, String text, String accent, boolean light) {
            NotifyWatchService.saveTheme(activity.getApplicationContext(), bg, bg2, text, accent, light);
            activity.runOnUiThread(() -> activity.applyThemeChrome(bg, light));
        }
    }
}
