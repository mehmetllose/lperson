package com.calismatakip.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Boot ve sessiz alarm: boş sistem kartı yok, yalnızca gerçek işlem bildirimi. */
public class NotifyWatchBoot extends BroadcastReceiver {
    public static final String ACTION_POLL = "com.calismatakip.app.NOTIFY_WATCH_POLL";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            try {
                if (NotifyWatchService.hasSavedSession(context)) NotifyWatchService.start(context);
            } catch (Exception ignored) {}
            return;
        }
        if (ACTION_POLL.equals(action)) {
            final PendingResult pending = goAsync();
            NotifyWatchService.runPoll(context, pending::finish);
        }
    }
}
