package com.calismatakip.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

/** PackageInstaller oturum sonucu. */
public final class UpdateInstallReceiver extends BroadcastReceiver {
    public static final String ACTION = "com.calismatakip.app.UPDATE_INSTALL";
    public static final String PREFS = "lperson";
    public static final String KEY_JUST_INSTALLED = "update_just_installed";
    public static final String KEY_INSTALLED_VER = "update_installed_ver";
    public static final String KEY_EXPECT_VER = "update_expect_ver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        switch (status) {
            case PackageInstaller.STATUS_PENDING_USER_ACTION: {
                Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm == null) {
                    Toast.makeText(context, "Yükleme onayı yok", Toast.LENGTH_LONG).show();
                    break;
                }
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                Toast.makeText(context, "Güncelle'ye bas", Toast.LENGTH_LONG).show();
                boolean launched = MainActivity.launchUpdateConfirm(confirm);
                if (!launched) {
                    try { context.startActivity(confirm); }
                    catch (Exception e) {
                        Toast.makeText(context, "Yükleme onayı açılamadı", Toast.LENGTH_LONG).show();
                    }
                }
                break;
            }
            case PackageInstaller.STATUS_SUCCESS: {
                final PendingResult pending = goAsync();
                String ver = "";
                try {
                    PackageInfo pi = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
                    if (pi != null && pi.versionName != null) ver = pi.versionName;
                } catch (PackageManager.NameNotFoundException ignored) {}
                SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                p.edit()
                        .putBoolean(KEY_JUST_INSTALLED, true)
                        .putString(KEY_INSTALLED_VER, ver)
                        .remove(KEY_EXPECT_VER)
                        .apply();
                Toast.makeText(context, "Güncelleme kuruldu", Toast.LENGTH_LONG).show();
                try {
                    Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                    if (launch != null) {
                        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        launch.putExtra("lperson_update_success", true);
                        context.startActivity(launch);
                    }
                } catch (Exception ignored) {}
                new Handler(Looper.getMainLooper()).postDelayed(pending::finish, 2000);
                break;
            }
            case PackageInstaller.STATUS_FAILURE_ABORTED:
                // Kullanıcı iptal — sessiz
                break;
            default:
                // Klasik yükleyiciye düşülecek; burada agresif hata gösterme
                if (msg != null && !msg.isEmpty()) {
                    Toast.makeText(context, "Kurulum: " + msg, Toast.LENGTH_LONG).show();
                }
                break;
        }
    }
}
