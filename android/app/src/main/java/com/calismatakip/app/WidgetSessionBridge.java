package com.calismatakip.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

public final class WidgetSessionBridge {
    private static final String PREFS = "lperson_widget_session";
    private static final String KEY = "ct_session";
    private final Context app;

    public WidgetSessionBridge(Context context) {
        this.app = context.getApplicationContext();
    }

    @JavascriptInterface
    public void saveSession(String raw) {
        prefs(app).edit().putString(KEY, raw == null ? "" : raw).apply();
    }

    @JavascriptInterface
    public String readSession() {
        String raw = prefs(app).getString(KEY, "");
        return raw == null ? "" : raw;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
