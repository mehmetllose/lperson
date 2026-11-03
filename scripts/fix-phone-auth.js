const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(file, "utf8");

const oldPhoneBlock = `    function normalizeTrPhoneDigits(input) {
      let d = String(input || "").replace(/\\D/g, "");
      if (d.startsWith("90") && d.length >= 12) d = "0" + d.slice(2);
      else if (d.startsWith("90") && d.length === 12) d = "0" + d.slice(2);
      if (d.length && d[0] !== "0") d = "0" + d;
      return d.slice(0, 11);
    }
    function formatTrPhoneDisplay(input) {
      const d = normalizeTrPhoneDigits(input);
      if (!d) return "";
      let out = d.slice(0, 4);
      if (d.length > 4) out += " " + d.slice(4, 7);
      if (d.length > 7) out += " " + d.slice(7, 9);
      if (d.length > 9) out += " " + d.slice(9, 11);
      return out;
    }
    function phoneDigitsTr(p) {
      const d = normalizeTrPhoneDigits(p);
      if (d.startsWith("0") && d.length >= 11) return d.slice(1, 11);
      if (d.startsWith("0") && d.length > 1) return d.slice(1);
      if (d.length >= 10) return d.slice(-10);
      return d;
    }`;

const newPhoneBlock = `    /** Türkiye cep: kanonik 10 hane (5xxxxxxxxx); baştaki 0 ve ülke kodu 90 çıkarılır */
    function phoneDigitsTr(p) {
      let d = String(p || "").replace(/\\D/g, "");
      if (!d) return "";
      if (d.startsWith("90") && d.length >= 11) d = d.slice(2);
      while (d.length > 10 && d.startsWith("0")) d = d.slice(1);
      if (d.length > 10) d = d.slice(-10);
      return d;
    }
    function normalizeTrPhoneDigits(input) {
      const ten = phoneDigitsTr(input);
      if (ten.length === 10) return "0" + ten;
      let d = String(input || "").replace(/\\D/g, "");
      if (d.startsWith("90") && d.length > 2) d = d.slice(2);
      if (d.length && d[0] !== "0") d = "0" + d;
      return d.slice(0, 11);
    }
    function formatTrPhoneDisplay(input) {
      const d = normalizeTrPhoneDigits(input);
      if (!d) return "";
      let out = d.slice(0, 4);
      if (d.length > 4) out += " " + d.slice(4, 7);
      if (d.length > 7) out += " " + d.slice(7, 9);
      if (d.length > 9) out += " " + d.slice(9, 11);
      return out;
    }
    function formatPhoneForStorage(input) {
      const ten = phoneDigitsTr(input);
      return ten.length === 10 ? formatTrPhoneDisplay(ten) : String(input || "").trim();
    }
    function normalizeUserPhonesInDb() {
      (DB.users || []).forEach(u => {
        if (!u.phone || !String(u.phone).trim()) return;
        const fmt = formatPhoneForStorage(u.phone);
        if (fmt) u.phone = fmt;
      });
    }
    function firebaseAuthErrorTr(e) {
      const code = e && e.code ? String(e.code) : "";
      const map = {
        "auth/invalid-phone-number": "Geçersiz telefon numarası.",
        "auth/too-many-requests": "Çok fazla deneme. Bir süre bekleyip tekrar deneyin.",
        "auth/quota-exceeded": "SMS kotası doldu. Firebase faturalandırma ve Telefon sağlayıcısı kontrol edilmeli.",
        "auth/operation-not-allowed": "Telefon ile giriş Firebase'de kapalı. Console → Authentication → Sign-in method → Phone etkinleştirin.",
        "auth/captcha-check-failed": "Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.",
        "auth/missing-phone-number": "Telefon numarası eksik.",
        "auth/invalid-app-credential": "reCAPTCHA veya uygulama anahtarı hatalı. Firebase Console → Authentication ayarlarını kontrol edin.",
        "auth/app-not-authorized": "Bu uygulama alan adı Firebase'de yetkili değil. Hosting / authorized domains listesine ekleyin.",
      };
      return map[code] || (e && e.message ? String(e.message) : "SMS gönderilemedi.");
    }`;

if (!html.includes(oldPhoneBlock.slice(0, 80))) {
  console.error("Old phone block not found");
  process.exit(1);
}
html = html.replace(oldPhoneBlock, newPhoneBlock);

html = html.replace(
  `    function loginIdentityMatches(u, input) {
      const key = String(input || "").trim().toLowerCase();
      if (!key || !u) return false;
      if (String(u.username ?? "").trim().toLowerCase() === key) return true;
      const digits = key.replace(/\\D/g, "");
      if (digits.length >= 10) {
        const ten = phoneDigitsTr(digits);
        const userTen = phoneDigitsTr(u.phone);
        if (ten.length === 10 && userTen.length === 10 && ten === userTen) return true;
      }
      return false;
    }`,
  `    function loginIdentityMatches(u, input) {
      const raw = String(input ?? "").trim();
      if (!raw || !u) return false;
      if (String(u.username ?? "").trim().toLowerCase() === raw.toLowerCase()) return true;
      const inTen = phoneDigitsTr(raw);
      const userTen = phoneDigitsTr(u.phone);
      return inTen.length === 10 && userTen.length === 10 && inTen === userTen;
    }`
);

html = html.replace(
  `        DB = { users, companies, records, advances, requests, tasklists };
        if (!DB.requests) DB.requests = [];`,
  `        DB = { users, companies, records, advances, requests, tasklists };
        normalizeUserPhonesInDb();
        if (!DB.requests) DB.requests = [];`
);

html = html.replace(
  `        destroyForgotRecaptcha();
        initAllTrPhoneInputs(panel);
      } else {`,
  `        destroyForgotRecaptcha();
        initAllTrPhoneInputs(panel);
        setTimeout(() => { createForgotRecaptchaVerifier().catch(() => {}); }, 400);
      } else {`
);

html = html.replace(
  `        } else {
          showForgotErr(msg || "SMS gönderilemedi. Firebase Authentication → Telefon sağlayıcısını kontrol edin.");
        }`,
  `        } else {
          showForgotErr(firebaseAuthErrorTr(e));
        }`
);

html = html.replace(
  `      const uname = document.getElementById("login-user").value.trim().toLowerCase();
      const pass  = document.getElementById("login-pass").value;
      if (!uname || !pass) { showAuthMsg("Kullanıcı adı / telefon ve şifre gerekli."); return; }
      const matchUser = u => loginIdentityMatches(u, uname);`,
  `      const rawLogin = document.getElementById("login-user").value.trim();
      const pass  = document.getElementById("login-pass").value;
      if (!rawLogin || !pass) { showAuthMsg("Kullanıcı adı / telefon ve şifre gerekli."); return; }
      const matchUser = u => loginIdentityMatches(u, rawLogin);`
);

html = html.replace(
  `placeholder="kullanici_adi veya 5323554903"`,
  `placeholder="kullanici_adi veya 5523554903"`
);

html = html.replace(
  `        const phone = document.getElementById("emp-phone").value.trim();
        const address = document.getElementById("emp-address").value.trim();
        const color = getSelectedPresetColor("#emp-color-presets", "#5b9cf6");
        if (!name || !uname || !pass) { showToast("Ad, kullanıcı adı ve şifre zorunlu", "warn"); return false; }`,
  `        const phone = formatPhoneForStorage(document.getElementById("emp-phone").value);
        const address = document.getElementById("emp-address").value.trim();
        const color = getSelectedPresetColor("#emp-color-presets", "#5b9cf6");
        if (!name || !uname || !pass) { showToast("Ad, kullanıcı adı ve şifre zorunlu", "warn"); return false; }`
);

html = html.replace(
  `        const phone = document.getElementById("emp-phone").value.trim();
        const address = document.getElementById("emp-address").value.trim();
        const weeklyOff = JSON.parse(document.getElementById("emp-wo-val").value || "[]");`,
  `        const phone = formatPhoneForStorage(document.getElementById("emp-phone").value);
        const address = document.getElementById("emp-address").value.trim();
        const weeklyOff = JSON.parse(document.getElementById("emp-wo-val").value || "[]");`
);

// Improve forgot-pass error when no account
html = html.replace(
  `        showForgotErr(matches.length === 0 ? "Bu numaraya kayıtlı hesap yok." : "Bu numara birden fazla hesapta. Yöneticiyle iletişime geçin.");`,
  `        showForgotErr(matches.length === 0 ? "Bu numaraya kayıtlı hesap yok. Patronunuzun personel kartına telefonunuzu doğru (05xx) kaydettiğinden emin olun." : "Bu numara birden fazla hesapta. Yöneticiyle iletişime geçin.");`
);

fs.writeFileSync(file, html);
console.log("OK: phone auth fixes applied");
