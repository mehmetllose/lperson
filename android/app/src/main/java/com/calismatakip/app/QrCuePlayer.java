package com.calismatakip.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.os.Handler;
import android.os.Looper;

/**
 * Onay: applepay.mp3. Red: aynı kayıt, daha pes ve yavaş, aynı tını.
 */
public final class QrCuePlayer {
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private QrCuePlayer() {}

    public static void play(Context context, boolean success) {
        Context app = context.getApplicationContext();
        MAIN.post(() -> start(app, success));
    }

    private static void start(Context app, boolean success) {
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        SoundPool pool = new SoundPool.Builder().setMaxStreams(1).setAudioAttributes(attrs).build();
        float rate = success ? 1f : 0.64f;
        float vol = success ? 0.78f : 0.7f;
        pool.setOnLoadCompleteListener((soundPool, sampleId, status) -> {
            if (status != 0) {
                soundPool.release();
                return;
            }
            soundPool.play(sampleId, vol, vol, 1, 0, rate);
            MAIN.postDelayed(soundPool::release, success ? 1800 : 2800);
        });
        pool.load(app, R.raw.qr_ok, 1);
    }
}
