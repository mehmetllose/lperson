package com.calismatakip.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Build;
import android.util.Base64;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;
import java.io.FileOutputStream;

public class QrInlineWidgetProvider extends AppWidgetProvider {

    static Intent scanIntent(Context context) {
        Intent launch = new Intent(context, WidgetInlineScanActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return launch;
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qr_inline);
        android.content.SharedPreferences prefs = context.getSharedPreferences("lperson_widget_session", Context.MODE_PRIVATE);
        String color = prefs.getString("qr_widget_color", "green");
        String label = prefs.getString("qr_widget_label", "QR TARA");
        File imageFile = new File(context.getFilesDir(), "qr_widget_image.jpg");
        Bitmap image = imageFile.isFile() ? BitmapFactory.decodeFile(imageFile.getAbsolutePath()) : null;
        views.setViewVisibility(R.id.widget_media_background, image == null ? View.GONE : View.VISIBLE);
        if (image != null) views.setImageViewBitmap(R.id.widget_media_background, image);
        views.setInt(R.id.widget_qr_badge, "setBackgroundResource", colorBackground(color));
        views.setTextViewText(R.id.widget_qr_label, safeLabel(label));
        views.setViewVisibility(R.id.widget_qr_image, View.VISIBLE);
        boolean hideQr = prefs.getBoolean("qr_widget_hide_qr", false);
        views.setViewVisibility(R.id.widget_qr_badge, hideQr ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_qr_label, hideQr ? View.GONE : View.VISIBLE);
        PendingIntent pi = PendingIntent.getActivity(context, 7700 + widgetId, scanIntent(context), pendingFlags());
        views.setOnClickPendingIntent(R.id.widget_inline_root, pi);
        manager.updateAppWidget(widgetId, views);
    }

    static void saveWidgetPreferences(Context context, String color, String label, String imageData) {
        Context app = context.getApplicationContext();
        File imageFile = new File(app.getFilesDir(), "qr_widget_image.jpg");
        saveCustomImage(imageData, imageFile);
        app.getSharedPreferences("lperson_widget_session", Context.MODE_PRIVATE).edit()
                .putString("qr_widget_color", safeColor(color))
                .putString("qr_widget_label", safeLabel(label))
                .apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(app);
        int[] ids = manager.getAppWidgetIds(new ComponentName(app, QrInlineWidgetProvider.class));
        for (int id : ids) updateWidget(app, manager, id);
    }

    static void saveQrHidden(Context context, boolean hidden) {
        Context app = context.getApplicationContext();
        app.getSharedPreferences("lperson_widget_session", Context.MODE_PRIVATE).edit()
                .putBoolean("qr_widget_hide_qr", hidden).apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(app);
        int[] ids = manager.getAppWidgetIds(new ComponentName(app, QrInlineWidgetProvider.class));
        for (int id : ids) updateWidget(app, manager, id);
    }

    private static String safeLabel(String value) {
        String label = value == null ? "" : value.trim().replaceAll("[\\r\\n\\t]", " ");
        if (label.isEmpty()) label = "QR TARA";
        return label.length() > 16 ? label.substring(0, 16) : label;
    }

    private static String safeColor(String value) {
        return "blue".equals(value) || "purple".equals(value) || "amber".equals(value) || "pink".equals(value) ? value : "green";
    }

    private static int colorBackground(String value) {
        switch (safeColor(value)) {
            case "blue": return R.drawable.widget_qr_action_blue;
            case "purple": return R.drawable.widget_qr_action_purple;
            case "amber": return R.drawable.widget_qr_action_amber;
            case "pink": return R.drawable.widget_qr_action_pink;
            default: return R.drawable.widget_qr_action_green;
        }
    }

    private static void saveCustomImage(String dataUrl, File target) {
        if (target.exists()) target.delete();
        if (dataUrl == null || !dataUrl.startsWith("data:image/") || dataUrl.length() > 140_000) return;
        int comma = dataUrl.indexOf(',');
        if (comma < 0) return;
        Bitmap source = null, landscape = null;
        try {
            byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
            if (bytes.length > 100_000) return;
            source = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (source == null) return;
            float scale = Math.max(384f / source.getWidth(), 192f / source.getHeight());
            float left = (384f - source.getWidth() * scale) / 2f;
            float top = (192f - source.getHeight() * scale) / 2f;
            landscape = Bitmap.createBitmap(384, 192, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(landscape);
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            canvas.drawBitmap(source, null, new android.graphics.RectF(left, top,
                    left + source.getWidth() * scale, top + source.getHeight() * scale), paint);
            try (FileOutputStream out = new FileOutputStream(target)) {
                landscape.compress(Bitmap.CompressFormat.JPEG, 84, out);
                out.flush();
            }
        } catch (Exception ignored) {
            if (target.exists()) target.delete();
        } finally {
            if (source != null && !source.isRecycled()) source.recycle();
            if (landscape != null && !landscape.isRecycled()) landscape.recycle();
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) updateWidget(context, manager, id);
    }
}
