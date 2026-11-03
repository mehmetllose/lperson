const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(file, "utf8");

if (!h.includes("firebase-functions-compat")) {
  h = h.replace(
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>\n  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js"></script>'
  );
}

if (!h.includes("let _functions = null")) {
  h = h.replace(
    "let _auth = null;",
    "let _auth = null;\n    let _functions = null;"
  );
  h = h.replace(
    `_fbReady = true;
        console.log("✅ Firebase başarıyla başlatıldı");`,
    `try {
          _functions = typeof firebase.functions === "function"
            ? firebase.app().functions("us-central1")
            : null;
        } catch (e) {
          _functions = null;
          console.warn("Firebase Functions başlatılamadı:", e);
        }
        _fbReady = true;
        console.log("✅ Firebase başarıyla başlatıldı");`
  );
}

const oldInput = `    function onTrPhoneInput(e) {
      const el = e.target;
      const caret = el.selectionStart == null ? 0 : el.selectionStart;
      const digitsBefore = (el.value.slice(0, caret).match(/\\d/g) || []).length;
      el.value = formatTrPhoneDisplay(el.value);
      let pos = 0;
      let seen = 0;
      const v = el.value;
      for (let i = 0; i < v.length && seen < digitsBefore; i++) {
        if (/\\d/.test(v[i])) seen++;
        pos = i + 1;
      }
      try { el.setSelectionRange(pos, pos); } catch (err) {}
    }
    function onTrPhoneBlur(e) {
      const el = e.target;
      const d = trPhoneRawDigits(el.value);
      el.value = !d || d === "0" ? "" : formatTrPhoneDisplay(d);
    }`;

const newInput = `    function onTrPhoneInput(e) {
      const el = e.target;
      const caret = el.selectionStart == null ? el.value.length : el.selectionStart;
      const digitsBefore = (el.value.slice(0, caret).match(/\\d/g) || []).length;
      let digits = el.value.replace(/\\D/g, "");
      if (digits.startsWith("90")) digits = "0" + digits.slice(2);
      if (digits.length && digits[0] !== "0") digits = "0" + digits;
      digits = digits.slice(0, 11);
      el.value = digits;
      let pos = 0;
      let seen = 0;
      for (let i = 0; i < el.value.length && seen < digitsBefore; i++) {
        seen++;
        pos = i + 1;
      }
      try { el.setSelectionRange(pos, pos); } catch (err) {}
    }
    function onTrPhoneBlur(e) {
      const el = e.target;
      const d = trPhoneRawDigits(el.value);
      el.value = !d || d === "0" ? "" : formatTrPhoneDisplay(d);
    }`;

if (!h.includes(oldInput.slice(0, 60))) {
  console.error("phone input block not found");
  process.exit(1);
}
h = h.replace(oldInput, newInput);

h = h.replace(
  "let _forgotVerifier = null;\n    let _phoneConfirmationResult = null;",
  "let _forgotVerifier = null;\n    let _phoneConfirmationResult = null;\n    let _forgotResetMethod = null;\n    let _forgotExpectedPhone = null;"
);

const oldToggleClear = `        _phoneConfirmationResult = null;
        window._forgotPassUserId = null;
        destroyForgotRecaptcha();`;
const newToggleClear = `        _phoneConfirmationResult = null;
        window._forgotPassUserId = null;
        _forgotResetMethod = null;
        _forgotExpectedPhone = null;
        destroyForgotRecaptcha();`;
h = h.replace(oldToggleClear, newToggleClear);

const oldSend = `      window._forgotPassUserId = matches[0].id;
      _forgotSmsSending = true;
      const smsBtn = document.querySelector("#forgot-pass-step1 .btn-secondary");
      const smsBtnTxt = smsBtn ? smsBtn.textContent : "";
      if (smsBtn) { smsBtn.disabled = true; smsBtn.textContent = "Gönderiliyor…"; }
      try {
        const verifier = _forgotVerifier || await createForgotRecaptchaVerifier();
        _phoneConfirmationResult = await _auth.signInWithPhoneNumber(e164, verifier);
        const s1 = document.getElementById("forgot-pass-step1");
        const s2 = document.getElementById("forgot-pass-step2");
        if (s1) s1.style.display = "none";
        if (s2) s2.style.display = "";
        const mask = dig.length === 10 ? "0" + dig.slice(0, 3) + "***" + dig.slice(-2) : e164;
        showToast("SMS gönderildi (" + mask + ") — kodu girin", "success");
      } catch (e) {
        console.warn(e);
        const msg = String(e.message || "");
        if (msg.includes("already been rendered")) {
          showForgotErr("Güvenlik doğrulaması yenilenemedi. Sayfayı yenileyip tekrar deneyin.");
        } else {
          showForgotErr(firebaseAuthErrorTr(e));
        }
        destroyForgotRecaptcha();
      } finally {
        _forgotSmsSending = false;
        if (smsBtn) { smsBtn.disabled = false; smsBtn.textContent = smsBtnTxt || "SMS Kodu Gönder"; }
      }
    }`;

const newSend = `      _forgotSmsSending = true;
      _forgotResetMethod = null;
      _forgotExpectedPhone = dig;
      _phoneConfirmationResult = null;
      window._forgotPassUserId = null;
      const smsBtn = document.querySelector("#forgot-pass-step1 .btn-secondary");
      const smsBtnTxt = smsBtn ? smsBtn.textContent : "";
      if (smsBtn) { smsBtn.disabled = true; smsBtn.textContent = "Gönderiliyor…"; }
      try {
        if (!_functions) throw new Error("Sunucu fonksiyonları hazır değil — sayfayı yenileyin.");
        const reqFn = _functions.httpsCallable("requestPasswordReset");
        const reqRes = await reqFn({ phoneDigits: dig });
        const payload = reqRes.data || {};
        if (!payload.uid) throw new Error("Sunucu yanıtı geçersiz.");
        window._forgotPassUserId = payload.uid;
        _forgotResetMethod = payload.method || "firebase_phone";
        const s1 = document.getElementById("forgot-pass-step1");
        const s2 = document.getElementById("forgot-pass-step2");
        if (s1) s1.style.display = "none";
        if (s2) s2.style.display = "";
        if (_forgotResetMethod === "fcm") {
          showToast("Doğrulama kodu bildirim olarak gönderildi — kodu girin", "success");
        } else {
          const verifier = _forgotVerifier || await createForgotRecaptchaVerifier();
          _phoneConfirmationResult = await _auth.signInWithPhoneNumber(e164, verifier);
          const mask = "0" + dig.slice(0, 3) + "***" + dig.slice(-2);
          showToast("SMS gönderildi (" + mask + ") — kodu girin", "success");
        }
      } catch (e) {
        console.warn(e);
        window._forgotPassUserId = null;
        _forgotResetMethod = null;
        const msg = String(e.message || e.details || "");
        if (msg.includes("already been rendered")) {
          showForgotErr("Güvenlik doğrulaması yenilenemedi. Sayfayı yenileyip tekrar deneyin.");
        } else if (e.code === "functions/not-found" || msg.includes("Kod hatalı")) {
          showForgotErr(e.message || "İşlem başarısız.");
        } else {
          showForgotErr(e.message || firebaseAuthErrorTr(e) || "Kod gönderilemedi.");
        }
        destroyForgotRecaptcha();
        const s1 = document.getElementById("forgot-pass-step1");
        const s2 = document.getElementById("forgot-pass-step2");
        if (s1) s1.style.display = "";
        if (s2) s2.style.display = "none";
      } finally {
        _forgotSmsSending = false;
        if (smsBtn) { smsBtn.disabled = false; smsBtn.textContent = smsBtnTxt || "SMS Kodu Gönder"; }
      }
    }`;

if (!h.includes("window._forgotPassUserId = matches[0].id;")) {
  console.error("sendForgotPassSms block not found");
  process.exit(1);
}
h = h.replace(oldSend, newSend);

const oldConfirm = `    async function confirmForgotPassAndReset() {
      const fe0 = document.getElementById("forgot-pass-err");
      if (fe0) { fe0.style.display = "none"; fe0.textContent = ""; }
      const code = document.getElementById("forgot-code")?.value.trim() || "";
      const np = document.getElementById("forgot-newpass")?.value || "";
      const np2 = document.getElementById("forgot-newpass2")?.value || "";
      if (!code || code.length < 4) { showForgotErr("SMS kodunu girin."); return; }
      if (!np || np.length < 4) { showForgotErr("Yeni şifre en az 4 karakter olmalı."); return; }
      if (np !== np2) { showForgotErr("Yeni şifreler eşleşmiyor."); return; }
      if (!_phoneConfirmationResult) { showForgotErr("Önce SMS gönderin."); return; }
      const uid = window._forgotPassUserId;
      try {
        await _phoneConfirmationResult.confirm(code);
        const u = (DB.users || []).find(x => x.id === uid);
        if (!u) { showForgotErr("Kullanıcı bulunamadı."); try { await _auth.signOut(); } catch (e) {} return; }
        u.password = np;
        try {
          await fsSetDoc("users", uid, { password: np });
        } catch (e) {
          console.warn(e);
          showForgotErr("Şifre sunucuya yazılamadı (Firestore izinleri). Yöneticiden \`users\` koleksiyonunda şifre güncellemesine izin verilmesini isteyin: " + (e.message || ""));
          try { await _auth.signOut(); } catch (e2) {}
          return;
        }
        localCacheSave();
        try { await _auth.signOut(); } catch (e) {}
        _phoneConfirmationResult = null;
        window._forgotPassUserId = null;
        showToast("Şifre güncellendi — yeni şifreyle giriş yapabilirsiniz ✓");
        toggleForgotPassPanel(false);
      } catch (e) {
        console.warn(e);
        showForgotErr(e.message || "Kod hatalı veya süresi doldu.");
        try { await _auth.signOut(); } catch (e2) {}
      }
    }`;

const newConfirm = `    async function confirmForgotPassAndReset() {
      const fe0 = document.getElementById("forgot-pass-err");
      if (fe0) { fe0.style.display = "none"; fe0.textContent = ""; }
      const code = document.getElementById("forgot-code")?.value.trim() || "";
      const np = document.getElementById("forgot-newpass")?.value || "";
      const np2 = document.getElementById("forgot-newpass2")?.value || "";
      if (!code || code.length < 6) { showForgotErr("6 haneli doğrulama kodunu girin."); return; }
      if (!np || np.length < 4) { showForgotErr("Yeni şifre en az 4 karakter olmalı."); return; }
      if (np !== np2) { showForgotErr("Yeni şifreler eşleşmiyor."); return; }
      const uid = window._forgotPassUserId;
      if (!uid || !_forgotResetMethod) { showForgotErr("Önce kod gönderin."); return; }
      if (!_functions) { showForgotErr("Sunucu fonksiyonları hazır değil."); return; }
      const btn = document.querySelector("#forgot-pass-step2 .btn-primary");
      if (btn) { btn.disabled = true; btn.textContent = "Kaydediliyor…"; }
      try {
        if (_forgotResetMethod === "fcm") {
          const fn = _functions.httpsCallable("confirmPasswordResetOtp");
          await fn({ uid, code, newPassword: np });
        } else if (_forgotResetMethod === "firebase_phone") {
          if (!_phoneConfirmationResult) { showForgotErr("Önce SMS gönderin."); return; }
          const cred = await _phoneConfirmationResult.confirm(code);
          if (!cred || !cred.user) throw new Error("Kod hatalı veya süresi doldu.");
          const authPhone = String(cred.user.phoneNumber || "");
          const expected = "+90" + (_forgotExpectedPhone || "");
          if (authPhone !== expected) throw new Error("Telefon doğrulanamadı.");
          const fn = _functions.httpsCallable("finalizePasswordResetPhone");
          await fn({ uid, newPassword: np });
          try { await _auth.signOut(); } catch (e) {}
        } else {
          showForgotErr("Önce kod gönderin.");
          return;
        }
        try { await syncFromFirestore(); } catch (e) {}
        _phoneConfirmationResult = null;
        window._forgotPassUserId = null;
        _forgotResetMethod = null;
        _forgotExpectedPhone = null;
        showToast("Şifre güncellendi — yeni şifreyle giriş yapabilirsiniz ✓");
        toggleForgotPassPanel(false);
      } catch (e) {
        console.warn(e);
        const msg = e.message || (e.details && String(e.details)) || "Kod hatalı veya süresi doldu.";
        showForgotErr(msg);
        try { await _auth.signOut(); } catch (e2) {}
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Doğrula Ve Şifreyi Kaydet"; }
      }
    }`;

if (!h.includes("await _phoneConfirmationResult.confirm(code);")) {
  console.error("confirm block not found");
  process.exit(1);
}
h = h.replace(oldConfirm, newConfirm);

h = h.replace(
  'if (!code || code.length < 4) { showForgotErr("SMS kodunu girin."); return; }',
  'if (!code || code.length < 6) { showForgotErr("6 haneli doğrulama kodunu girin."); return; }'
);

fs.writeFileSync(file, h);
console.log("OK");
