package com.calismatakip.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.net.Uri;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Size;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONObject;
import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Home-screen card: camera stays over the launcher. The lPerson screens are not shown.
 * A hidden WebView runs the existing QR clock logic.
 */
public class WidgetInlineScanActivity extends AppCompatActivity {

    private static final int REQ_PERMS = 7721;
    private boolean waitingCameraSettings = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean scanned = new AtomicBoolean(false);
    private final AtomicBoolean analyzing = new AtomicBoolean(false);

    private PreviewView previewView;
    private TextView statusView;
    private LinearLayout scanCard;
    private LinearLayout resultCard;
    private TextView resultIcon;
    private TextView resultKicker;
    private TextView resultTitle;
    private TextView resultName;
    private TextView resultDate;
    private TextView resultTime;
    private TextView resultSub;
    private WebView web;
    private ProcessCameraProvider cameraProvider;
    private Camera boundCamera;
    private Button torchButton;
    private boolean torchOn;
    private BarcodeScanner barcodeScanner;
    private ExecutorService cameraExecutor;
    private String bootState = "";
    private String queuedQr = null;
    private boolean outcomeShown = false;
    private boolean pollStarted = false;
    private int polls = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_inline_scan);
        previewView = findViewById(R.id.inline_preview);
        statusView = findViewById(R.id.inline_status);
        scanCard = findViewById(R.id.inline_scan_card);
        resultCard = findViewById(R.id.inline_result_card);
        resultIcon = findViewById(R.id.inline_result_icon);
        resultKicker = findViewById(R.id.inline_result_kicker);
        resultTitle = findViewById(R.id.inline_result_title);
        resultName = findViewById(R.id.inline_result_name);
        resultDate = findViewById(R.id.inline_result_date);
        resultTime = findViewById(R.id.inline_result_time);
        resultSub = findViewById(R.id.inline_result_sub);
        web = findViewById(R.id.inline_web);
        Button close = findViewById(R.id.inline_close);
        close.setOnClickListener(v -> finish());
        torchButton = findViewById(R.id.inline_torch);
        torchButton.setOnClickListener(v -> toggleTorch());
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        cameraExecutor = Executors.newSingleThreadExecutor();
        barcodeScanner = BarcodeScanning.getClient(
                new BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build());
        setupWeb();
        ensurePermsAndCamera();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWeb() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBlockNetworkImage(true);
        web.addJavascriptInterface(new WidgetSessionBridge(this), "AndroidInlineStore");
        web.addJavascriptInterface(new ScanBridge(), "AndroidInlineScan");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return null;
                if (!"GET".equalsIgnoreCase(request.getMethod())) return null;
                Uri uri = request.getUrl();
                if (!"lperson.web.app".equalsIgnoreCase(uri.getHost())) return null;
                return assetResponse(uri.getPath());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                startBootPoll();
            }
        });
        if (cameraExecutor != null) {
            cameraExecutor.execute(this::loadAppHtml);
        } else {
            loadAppHtml();
        }
    }

    private void loadAppHtml() {
        try {
            InputStream in = getAssets().open("public/index.html");
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) >= 0) bos.write(buf, 0, n);
            in.close();
            String html = bos.toString("UTF-8");
            runOnUiThread(() -> {
                if (web == null || isFinishing()) return;
                web.loadDataWithBaseURL("https://lperson.web.app/", html, "text/html", "UTF-8", null);
            });
        } catch (IOException e) {
            runOnUiThread(() -> setStatus("Uygulama dosyası okunamadı."));
        }
    }

    private WebResourceResponse assetResponse(String path) {
        if (path == null) return null;
        if (path.startsWith("/")) path = path.substring(1);
        if (path.isEmpty() || "/".equals(path)) path = "index.html";
        int q = path.indexOf('?');
        if (q >= 0) path = path.substring(0, q);
        if (path.contains("..")) return null;
        try {
            InputStream in = getAssets().open("public/" + path);
            return new WebResourceResponse(mimeFor(path), textFile(path) ? "UTF-8" : null, in);
        } catch (IOException e) {
            return null;
        }
    }

    private static boolean textFile(String path) {
        String p = path.toLowerCase();
        return p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".html") || p.endsWith(".json") || p.endsWith(".svg");
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private void startBootPoll() {
        if (pollStarted || outcomeShown) return;
        pollStarted = true;
        pollBoot();
    }

    private void pollBoot() {
        if (isFinishing() || outcomeShown || web == null) return;
        web.evaluateJavascript("(function(){return window.__inlineWidgetBooted||'';})()", value -> {
            String v = unquote(value);
            if ("staff".equals(v) || "idle".equals(v)) {
                onBoot(v);
                return;
            }
            polls++;
            if (polls >= 46) {
                setStatus("Bağlantı kurulamadı. İnterneti açıp tekrar deneyin.");
                return;
            }
            handler.postDelayed(this::pollBoot, 500);
        });
    }

    private void onBoot(String state) {
        if (outcomeShown) return;
        bootState = state;
        if ("staff".equals(state)) {
            setStatus(queuedQr == null ? "Kamerayı işyeri QR koduna tutun" : "QR işleniyor…");
            if (queuedQr != null) {
                String raw = queuedQr;
                queuedQr = null;
                submitQr(raw);
            }
            return;
        }
        queuedQr = null;
        scanned.set(false);
        setStatus("Önce uygulamada personel hesabıyla bir kez giriş yapın.");
    }

    private void onQr(String raw) {
        if (outcomeShown || raw == null || raw.isEmpty()) return;
        if ("staff".equals(bootState)) {
            submitQr(raw);
            return;
        }
        if ("idle".equals(bootState)) {
            scanned.set(false);
            setStatus("Önce uygulamada personel hesabıyla bir kez giriş yapın.");
            return;
        }
        queuedQr = raw;
        setStatus("QR okundu, oturum bekleniyor…");
    }

    private void submitQr(String raw) {
        if (web == null || outcomeShown) return;
        setStatus("QR işleniyor…");
        String b64 = Base64.encodeToString(raw.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        String js = "(function(){try{consumeInlineWidgetQr(atob('" + b64 + "'));}catch(e){try{AndroidInlineScan.onResult(JSON.stringify({ok:false,kind:'error',title:'QR işlenemedi',subtitle:''}));}catch(e2){}}})()";
        web.evaluateJavascript(js, null);
    }

    void showOutcome(String json) {
        if (outcomeShown) return;
        outcomeShown = true;
        scanned.set(true);
        boolean ok = false;
        String kind = "error";
        String title = "İşlenemedi";
        String subtitle = "";
        String name = "";
        String date = "";
        String time = "";
        try {
            JSONObject o = new JSONObject(json == null ? "{}" : json);
            ok = o.optBoolean("ok", false);
            kind = o.optString("kind", ok ? "in" : "error");
            title = o.optString("title", ok ? "Giriş" : "İşlenemedi");
            subtitle = o.optString("subtitle", "");
            name = o.optString("name", "");
            date = o.optString("date", "");
            time = o.optString("time", "");
        } catch (Exception ignored) {
            if (json != null && !json.trim().isEmpty()) title = json.trim();
        }
        try {
            if (cameraProvider != null) cameraProvider.unbindAll();
        } catch (Exception ignored) {
        }
        presentResult(ok, kind, title, subtitle, name, date, time);
        QrCuePlayer.play(this, ok);
        handler.postDelayed(() -> {
            if (!isFinishing()) finish();
        }, ok ? 2800 : 3400);
    }

    private void presentResult(boolean ok, String kind, String title, String subtitle, String name, String date, String time) {
        int color = Color.parseColor("#FB923C");
        String icon = "!";
        String kicker = "UYARI";
        if ("in".equals(kind)) {
            color = Color.parseColor("#4ADE80");
            icon = "✓";
            kicker = "GİRİŞ KAYDI";
        } else if ("out".equals(kind)) {
            color = Color.parseColor("#F87171");
            icon = "↗";
            kicker = "ÇIKIŞ KAYDI";
        }
        if (scanCard != null) scanCard.setVisibility(View.GONE);
        if (resultCard != null) resultCard.setVisibility(View.VISIBLE);
        if (resultIcon != null) {
            resultIcon.setText(icon);
            resultIcon.setTextColor(color);
        }
        if (resultKicker != null) {
            resultKicker.setText(kicker);
            resultKicker.setTextColor(color);
        }
        if (resultTitle != null) resultTitle.setText(title == null || title.isEmpty() ? (ok ? "Kaydedildi" : "İşlenemedi") : title);
        if (resultName != null) {
            boolean hasName = name != null && !name.trim().isEmpty();
            resultName.setVisibility(hasName ? View.VISIBLE : View.GONE);
            resultName.setText(hasName ? name.trim() : "");
        }
        boolean hasClock = time != null && !time.trim().isEmpty();
        if (resultDate != null) {
            resultDate.setVisibility(hasClock || (date != null && !date.isEmpty()) ? View.VISIBLE : View.GONE);
            resultDate.setText(date == null ? "" : date);
        }
        if (resultTime != null) {
            resultTime.setVisibility(hasClock ? View.VISIBLE : View.GONE);
            resultTime.setText(hasClock ? time.trim() : "");
            resultTime.setTextColor(color);
        }
        if (resultSub != null) {
            boolean hasSub = subtitle != null && !subtitle.trim().isEmpty();
            resultSub.setVisibility(hasSub ? View.VISIBLE : View.GONE);
            resultSub.setText(hasSub ? subtitle.trim() : "");
        }
    }

    private void toggleTorch() {
        if (boundCamera == null) return;
        torchOn = !torchOn;
        try {
            boundCamera.getCameraControl().enableTorch(torchOn);
        } catch (Exception e) {
            torchOn = false;
        }
        if (torchButton != null) torchButton.setText(torchOn ? "Flaş açık" : "Flaş");
    }

    private void setStatus(String text) {
        if (statusView != null) statusView.setText(text);
    }

    private void ensurePermsAndCamera() {
        boolean cam = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        if (!cam) {
            ActivityCompat.requestPermissions(this, new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQ_PERMS);
            return;
        }
        startCamera();
    }

    private void startCamera() {
        ProcessCameraProvider.getInstance(this).addListener(() -> {
            try {
                cameraProvider = ProcessCameraProvider.getInstance(this).get();
                bindCamera(cameraProvider);
            } catch (Exception e) {
                setStatus("Kamera açılamadı.");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindCamera(ProcessCameraProvider provider) {
        Preview preview = new Preview.Builder().setTargetResolution(new Size(1280, 720)).build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        ImageAnalysis analysis = new ImageAnalysis.Builder()
                .setTargetResolution(new Size(1280, 720))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();
        analysis.setAnalyzer(cameraExecutor, this::analyze);
        CameraSelector selector = CameraSelector.DEFAULT_BACK_CAMERA;
        try {
            provider.unbindAll();
            boundCamera = provider.bindToLifecycle(this, selector, preview, analysis);
            torchOn = false;
            if (torchButton != null) torchButton.setText("Flaş");
            if (!outcomeShown && queuedQr == null && !"idle".equals(bootState)) {
                if ("staff".equals(bootState)) setStatus("Kamerayı işyeri QR koduna tutun");
            }
        } catch (Exception e) {
            setStatus("Kamera açılamadı.");
        }
    }

    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyze(ImageProxy imageProxy) {
        if (scanned.get() || outcomeShown || !analyzing.compareAndSet(false, true)) {
            imageProxy.close();
            return;
        }
        if (imageProxy.getImage() == null) {
            analyzing.set(false);
            imageProxy.close();
            return;
        }
        InputImage input = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());
        barcodeScanner.process(input)
                .addOnSuccessListener(barcodes -> {
                    if (scanned.get()) return;
                    for (Barcode barcode : barcodes) {
                        String raw = barcode.getRawValue();
                        if (raw != null && !raw.trim().isEmpty()) {
                            if (scanned.compareAndSet(false, true)) {
                                String value = raw.trim();
                                runOnUiThread(() -> onQr(value));
                            }
                            break;
                        }
                    }
                })
                .addOnCompleteListener(task -> {
                    analyzing.set(false);
                    imageProxy.close();
                });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_PERMS) return;
        boolean cam = false;
        for (int i = 0; i < permissions.length; i++) {
            if (Manifest.permission.CAMERA.equals(permissions[i])) {
                cam = grantResults.length > i && grantResults[i] == PackageManager.PERMISSION_GRANTED;
            }
        }
        if (cam) { startCamera(); return; }
        if (!ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)) {
            // "Bir daha sorma" seçilmiş: sistem penceresi artık açılmaz, uygulama ayarlarını aç.
            setStatus("Kamera izni kapalı. Ayarlar > İzinler > Kamera'yı açın.");
            waitingCameraSettings = true;
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                startActivity(i);
            } catch (Exception ignored) {}
        } else {
            setStatus("Kamera izni gerekli.");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (waitingCameraSettings && ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            waitingCameraSettings = false;
            setStatus("");
            startCamera();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        try {
            if (cameraProvider != null) cameraProvider.unbindAll();
        } catch (Exception ignored) {
        }
        if (barcodeScanner != null) barcodeScanner.close();
        if (cameraExecutor != null) cameraExecutor.shutdown();
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    private static String unquote(String value) {
        if (value == null) return "";
        String v = value.trim();
        if ("null".equals(v)) return "";
        if (v.length() >= 2 && v.charAt(0) == '"' && v.charAt(v.length() - 1) == '"') {
            v = v.substring(1, v.length() - 1);
        }
        return v;
    }

    private final class ScanBridge {
        @JavascriptInterface
        public void onResult(String json) {
            runOnUiThread(() -> showOutcome(json));
        }
    }
}
