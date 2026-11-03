const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");

function rep(old, neu, label) {
  if (!h.includes(old)) {
    console.warn("MISSING:", label);
    return false;
  }
  h = h.replace(old, neu);
  return true;
}

rep(
  `<motion.div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.45;">Kayıtlı <b>cep telefonunuza</b> SMS kodu gönderilir. Güvenlik kutusunu tamamlayıp gönderin; kodu girdikten sonra yeni şifrenizi belirleyin.</motion.div>`,
  `<div id="forgot-pass-help" style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.45;">Doğrulama kodu gönderilir. Uygulamada: önce uygulamadan çıkış yapın, sonra kod bildirim olarak gelir. Web’de SMS kullanılır.</div>`,
  "forgot help"
) || rep(
  `Kayıtlı <b>cep telefonunuza</b> SMS kodu gönderilir. Güvenlik kutusunu tamamlayıp gönderin; kodu girdikten sonra yeni şifrenizi belirleyin.`,
  `Doğrulama kodu gönderilir. Uygulamada: önce uygulamadan çıkış yapın, sonra kod bildirim olarak gelir. Web’de SMS kullanılır.`,
  "forgot help2"
);

rep(
  `<div style="font-size:11px;color:var(--text3);margin:8px 0 4px;">Önce güvenlik kutusunu işaretleyin, sonra gönderin.</div>`,
  `<div id="forgot-recaptcha-hint" style="font-size:11px;color:var(--text3);margin:8px 0 4px;">Önce güvenlik kutusunu işaretleyin, sonra gönderin.</div>`,
  "recaptcha hint id"
) || rep(
  `margin:8px 0 4px;">Önce güvenlik kutusunu işaretleyin`,
  `margin:8px 0 4px;" id="forgot-recaptcha-hint">Önce güvenlik kutusunu işaretleyin`,
  "recaptcha hint id2"
);

rep(`onclick="sendForgotPassSms()">SMS Kodu Gönder</button>`, `onclick="sendForgotPassSms()">Kod Gönder</button>`, "btn label");

// createForgotRecaptchaVerifier - replace block
const oldRecaptcha = `    let _forgotRecaptchaReady = false;
    async function createForgotRecaptchaVerifier() {
      destroyForgotRecaptcha();
      _forgotRecaptchaReady = false;
      const el = document.getElementById("recaptcha-container");
      if (!el || !_auth) throw new Error("reCAPTCHA hazır değil");
      return new Promise((resolve, reject) => {
        try {
          _forgotVerifier = new firebase.auth.RecaptchaVerifier(el, {
            size: "normal",
            callback: () => { _forgotRecaptchaReady = true; },
            "expired-callback": () => {
              _forgotRecaptchaReady = false;
              destroyForgotRecaptcha();
            },
          });
          _forgotVerifier.render().then(() => resolve(_forgotVerifier)).catch(reject);
        } catch (err) {
          reject(err);
        }
      });
    }
    async function sendFirebasePhoneSms(e164) {
      const verifier = _forgotVerifier || await createForgotRecaptchaVerifier();
      if (!_forgotRecaptchaReady) {
        showForgotErr("Lütfen önce «Ben robot değilim» kutusunu işaretleyin, ardından tekrar deneyin.");
        throw new Error("recaptcha-not-checked");
      }
      return _auth.signInWithPhoneNumber(e164, verifier);
    }`;

const newRecaptcha = `    let _forgotRecaptchaReady = false;
    function updateForgotPassHelpText() {
      const el = document.getElementById("forgot-pass-help");
      if (!el) return;
      if (isCapacitorNative()) {
        el.innerHTML = "Uygulamadan <b>çıkış yaptıysanız</b> doğrulama kodu yalnızca <b>bildirim</b> olarak gelir (giriş yapılıyken kod gönderilmez).";
      } else {
        el.innerHTML = "Web’de kod <b>SMS</b> ile gelir. Güvenlik kutusunu işaretleyip gönderin.";
      }
    }
    async function createForgotRecaptchaVerifier() {
      destroyForgotRecaptcha();
      _forgotRecaptchaReady = false;
      const el = document.getElementById("recaptcha-container");
      if (!el || !_auth) throw new Error("reCAPTCHA hazır değil");
      const native = isCapacitorNative();
      if (native) {
        el.style.display = "none";
        _forgotVerifier = new firebase.auth.RecaptchaVerifier(el, {
          size: "invisible",
          callback: () => { _forgotRecaptchaReady = true; },
          "expired-callback": () => { _forgotRecaptchaReady = false; destroyForgotRecaptcha(); },
        });
        await _forgotVerifier.render();
        _forgotRecaptchaReady = true;
        return _forgotVerifier;
      }
      return new Promise((resolve, reject) => {
        try {
          el.style.display = "";
          _forgotVerifier = new firebase.auth.RecaptchaVerifier(el, {
            size: "normal",
            callback: () => { _forgotRecaptchaReady = true; },
            "expired-callback": () => {
              _forgotRecaptchaReady = false;
              destroyForgotRecaptcha();
            },
          });
          _forgotVerifier.render().then(() => resolve(_forgotVerifier)).catch(reject);
        } catch (err) {
          reject(err);
        }
      });
    }
    async function sendFirebasePhoneSms(e164) {
      const verifier = _forgotVerifier || await createForgotRecaptchaVerifier();
      if (!isCapacitorNative() && !_forgotRecaptchaReady) {
        showForgotErr("Lütfen önce «Ben robot değilim» kutusunu işaretleyin, ardından tekrar deneyin.");
        throw new Error("recaptcha-not-checked");
      }
      return _auth.signInWithPhoneNumber(e164, verifier);
    }
    async function persistResetFcmTokenOnLogout(uid) {
      const token = window.__lastFcmToken || (DB.users || []).find(u => u.id === uid)?.fcmToken;
      if (!token || !_fbReady || !uid) return;
      try {
        await fsSetDoc("users", uid, {
          resetFcmToken: token,
          resetFcmTokenAt: Date.now(),
        }, { merge: true });
      } catch (e) {
        console.warn("resetFcmToken:", e);
      }
    }`;

rep(oldRecaptcha, newRecaptcha, "recaptcha block");

// toggleForgotPassPanel - add updateForgotPassHelpText and native class
rep(
  `        initAllTrPhoneInputs(panel);
        setTimeout(() => { createForgotRecaptchaVerifier().catch(() => {}); }, 400);`,
  `        initAllTrPhoneInputs(panel);
        document.documentElement.classList.toggle("ct-native-app", isCapacitorNative());
        updateForgotPassHelpText();
        if (!isCapacitorNative()) setTimeout(() => { createForgotRecaptchaVerifier().catch(() => {}); }, 400);`,
  "toggle forgot native"
);

// sendForgotPassSms - replace delivered block
const oldSend = `        let delivered = false;
        if (_functions) {
          try {
            const reqRes = await _functions.httpsCallable("requestPasswordReset")({ phoneDigits: dig });
            const payload = reqRes.data || {};
            if (payload.uid) window._forgotPassUserId = payload.uid;
            if (payload.method === "fcm") {
              _forgotResetMethod = "fcm";
              showStep2();
              showToast("Doğrulama kodu telefon bildiriminize gönderildi.", "success");
              delivered = true;
            }
          } catch (fnErr) {
            console.warn("requestPasswordReset:", fnErr);
          }
        }
        if (!delivered) {`;

const newSend = `        let delivered = false;
        const nativeApp = isCapacitorNative();
        if (_functions) {
          try {
            const reqRes = await _functions.httpsCallable("requestPasswordReset")({
              phoneDigits: dig,
              preferAppPush: nativeApp,
            });
            const payload = reqRes.data || {};
            if (payload.uid) window._forgotPassUserId = payload.uid;
            if (payload.method === "fcm") {
              _forgotResetMethod = "fcm";
              showStep2();
              showToast("Doğrulama kodu bildirim olarak gönderildi — uygulama bildirimlerinize bakın.", "success");
              delivered = true;
            } else if (payload.noResetToken && nativeApp) {
              showForgotErr("Önce mobil uygulamadan giriş yapıp çıkış yapın; ardından tekrar kod isteyin.");
              return;
            }
          } catch (fnErr) {
            console.warn("requestPasswordReset:", fnErr);
            if (nativeApp) {
              showForgotErr(fnErr.message || "Kod gönderilemedi. Uygulamadan çıkış yapıp tekrar deneyin.");
              return;
            }
          }
        }
        if (!delivered && nativeApp) {
          showForgotErr("Şifre kodu için önce uygulamadan çıkış yapın (bildirim bu cihaza gelir).");
          return;
        }
        if (!delivered) {`;

rep(oldSend, newSend, "sendForgotPass");

// doLogout - save reset token
rep(
  `    function doLogout() {
      const uid = currentUser?.id;
      stopFirestoreLiveSync();`,
  `    function doLogout() {
      const uid = currentUser?.id;
      if (uid && isCapacitorNative()) void persistResetFcmTokenOnLogout(uid);
      stopFirestoreLiveSync();`,
  "logout reset token"
);

// launchApp - add native class
rep(
  `      document.getElementById("app-screen").style.display = "flex";`,
  `      document.getElementById("app-screen").style.display = "flex";
      document.documentElement.classList.toggle("ct-native-app", isCapacitorNative());`,
  "launch native class"
);

// notifications page header
rep(
  `            <motion.div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
              <div class="section-hd" style="margin:0;">Bildirimler</div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri Sıfırla</button>
            </motion.div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5;">Giriş/çıkış, talep sonuçları ve hatırlatmalar bu cihazda toplanır.</motion.div>`,
  `            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
              <div class="section-hd" style="margin:0;">Bildirimler</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotificationsByKind('request_adv')">Avansları Temizle</button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Tümünü Sıfırla</button>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5;">Giriş/çıkış ve talep sonuçları bu cihazda toplanır.</div>`,
  "notif header"
) || rep(
  `<button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri Sıfırla</button>`,
  `<button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotificationsByKind('request_adv')">Avansları Temizle</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Tümünü Sıfırla</button>`,
  "notif header2"
);

fs.writeFileSync(p, h);
console.log("patch done");
