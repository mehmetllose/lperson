/**
 * Cloud Functions — arka plan FCM (sistem bildirim çubuğu)
 *
 * Tetikler:
 * - records/{workerId} yazıldığında: çalışan giriş/çıkış (patronlara, ayar açıksa)
 * - requests/{id}: yeni bekleyen talep (patronlara), onay/red (çalışana)
 *
 * Gereksinim: Blaze planı, FCM etkin Firebase projesi, Android'de google-services.json
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
// Firestore tetikleyicileri: fonksiyon bölgesi, Firestore konumu ile uyumlu olmalı.
// Varsayılan Firebase Firestore çoğu projede ABD çok bölgeli (nam5) → us-central1 kullanın.
// Firestore’unuz “eur3” (Avrupa) ise burayı "europe-west1" yapın (Firebase Console → Firestore → konum).
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

function istanbulTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function normalizeRec(r) {
  if (!r) return { shifts: [], note: "", leaveType: null };
  if (r.shifts) return { leaveType: null, note: "", ...r };
  const shifts = [];
  if (r.start || r.end) shifts.push({ start: r.start || "", end: r.end || "" });
  return { shifts, note: r.note || "", leaveType: r.leaveType || null };
}

function shiftStats(rec) {
  const s = normalizeRec(rec).shifts.filter((x) => x && x.silent !== true);
  return {
    withStart: s.filter((x) => x.start).length,
    closed: s.filter((x) => x.start && x.end).length,
  };
}

function stringifyData(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] == null) continue;
    out[k] = typeof obj[k] === "string" ? obj[k] : JSON.stringify(obj[k]);
  }
  return out;
}

async function getUser(workerId) {
  const doc = await admin.firestore().doc(`users/${workerId}`).get();
  if (!doc.exists) return null;
  return { id: workerId, ...doc.data() };
}

async function companyAllowsPatronClockNotify(companyId) {
  const doc = await admin.firestore().doc(`companies/${companyId}`).get();
  if (!doc.exists) return true;
  const s = doc.data().settings || {};
  return s.notifyPatronOnClockIn !== false;
}

async function collectPatronTokens(companyId) {
  const qs = await admin
    .firestore()
    .collection("users")
    .where("companyId", "==", companyId)
    .get();
  const tokens = [];
  qs.forEach((d) => {
    const u = d.data();
    if (u.role !== "patron") return;
    const t = u.fcmToken;
    if (t && typeof t === "string") tokens.push(t);
  });
  return [...new Set(tokens)];
}

async function sendMulticast(tokens, { title, body, data }) {
  const unique = [...new Set(tokens)].filter(Boolean);
  if (!unique.length) {
    console.warn("sendMulticast: patron fcmToken yok", title);
    return;
  }
  const chunkSize = 500;
  const notification = {
    title: String(title || "").slice(0, 200),
    body: String(body || "").slice(0, 400),
  };
  const dataStr = stringifyData(data || {});

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification,
        data: dataStr,
        android: {
          priority: "high",
          notification: {
            channelId: "ct_shift",
            sound: "default",
          },
        },
      });
      if (res.failureCount) {
        const reasons = res.responses.filter((r) => !r.success).map((r) => r.error?.code || r.error?.message || "fail");
        console.warn("sendMulticast failures", res.failureCount, reasons.join(","));
      }
    } catch (e) {
      console.warn("sendEachForMulticast", e.message);
    }
  }
}

async function sendToToken(token, { title, body, data }) {
  if (!token || typeof token !== "string") return;
  try {
    await admin.messaging().send({
      token,
      notification: {
        title: String(title || "").slice(0, 200),
        body: String(body || "").slice(0, 400),
      },
      data: stringifyData(data || {}),
      android: {
        priority: "high",
        notification: {
          channelId: "ct_shift",
          sound: "default",
        },
      },
    });
  } catch (e) {
    console.warn("sendToToken", e.message);
  }
}

exports.onRecordWritePush = onDocumentWritten("records/{workerId}", async (event) => {
  const workerId = event.params.workerId;
  const before = event.data.before.exists ? event.data.before.data() : {};
  const after = event.data.after.exists ? event.data.after.data() : {};
  const dataBefore = before.data_ || {};
  const dataAfter = after.data_ || {};

  const worker = await getUser(workerId);
  if (!worker || worker.role !== "calisan" || !worker.companyId) return;

  const today = istanbulTodayKey();
  const statB = shiftStats(dataBefore[today]);
  const statA = shiftStats(dataAfter[today]);

  const openInc = statA.withStart > statB.withStart;
  const closedInc = statA.closed > statB.closed;
  if (!openInc && !closedInc) return;

  const ok = await companyAllowsPatronClockNotify(worker.companyId);
  if (!ok) return;

  const tokens = await collectPatronTokens(worker.companyId);
  const name = worker.name || "Çalışan";

  if (openInc) {
    const last = normalizeRec(dataAfter[today]).shifts.filter((x) => x.start && x.silent !== true).pop();
    await sendMulticast(tokens, {
      title: "İşyeri · Giriş",
      body: `${name} giriş yaptı — ${last?.start || "?"}`,
      data: { ct: "clock_in", workerId, companyId: worker.companyId, dateKey: today },
    });
  }

  if (closedInc) {
    const closed = normalizeRec(dataAfter[today]).shifts.filter((x) => x.start && x.end && x.silent !== true);
    const last = closed[closed.length - 1];
    await sendMulticast(tokens, {
      title: "İşyeri · Çıkış",
      body: `${name} çıkış yaptı — ${last?.end || "?"}`,
      data: { ct: "clock_out", workerId, companyId: worker.companyId, dateKey: today },
    });
  }
});

exports.onRequestWritePush = onDocumentWritten("requests/{requestId}", async (event) => {
  const requestId = event.params.requestId;
  const beforeSnap = event.data.before;
  const afterSnap = event.data.after;
  if (!afterSnap.exists) return;

  const before = beforeSnap.exists ? beforeSnap.data() : null;
  const after = afterSnap.data();
  const companyId = after.companyId;
  if (!companyId) return;

  // Yeni talep → patronlar
  if (
    !before &&
    after.status === "pending" &&
    (after.type === "hour" || after.type === "adv" || after.type === "leave")
  ) {
    const tokens = await collectPatronTokens(companyId);
    const worker = (await getUser(after.userId)) || {};
    const wname = worker.name || "Çalışan";
    let title = "Yeni Talep";
    let body = "";
    if (after.type === "adv") {
      const cur = (await admin.firestore().doc(`companies/${companyId}`).get()).data()?.settings?.currency || "₺";
      title = "Avans Talebi";
      body = `${wname} — ${cur}${Number(after.amount || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (after.desc) body += "\n" + String(after.desc).slice(0, 120);
    } else if (after.type === "leave") {
      title = after.isHourlyLeave ? "Saatlik İzin Talebi" : "İzin Talebi";
      body = after.isHourlyLeave
        ? `${wname} — ${after.startDate || "?"} ${after.startTime || ""}–${after.endTime || ""}`
        : `${wname} — ${after.startDate || "?"} → ${after.endDate || "?"}`;
      if (after.note) body += "\n" + String(after.note).slice(0, 120);
    } else {
      title = "Saat Düzeltme Talebi";
      body = `${wname} — ${after.dateKey || "Tarih ?"}`;
      if (after.note) body += "\n" + String(after.note).slice(0, 120);
    }
    await sendMulticast(tokens, {
      title,
      body,
      data: { ct: "request_new", requestId, companyId, userId: after.userId || "", reqType: after.type || "" },
    });
    return;
  }

  // Onay / red → çalışan
  if (
    before &&
    before.status === "pending" &&
    (after.status === "approved" || after.status === "rejected")
  ) {
    const u = await getUser(after.userId);
    const token = u?.fcmToken;
    const approved = after.status === "approved";
    const verdict = approved ? "onaylandı" : "reddedildi";
    const uName = u?.name || "Personel";
    let title = "Talep Sonucu";
    let body = `Sayın ${uName}, talebiniz ${verdict}.`;
    if (after.type === "adv") {
      title = "Avans Talebi";
      if (after.amount != null) {
        const comp = await admin.firestore().doc(`companies/${companyId}`).get();
        const cur = comp.data()?.settings?.currency || "₺";
        const amt = `${cur}${Number(after.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        body = `Sayın ${uName}, ${amt} tutarındaki avans talebiniz ${verdict}.`;
      } else {
        body = `Sayın ${uName}, avans talebiniz ${verdict}.`;
      }
    } else if (after.type === "leave") {
      title = "İzin Talebi";
      let days = 1;
      if (after.startDate && after.endDate) {
        const a = new Date(after.startDate + "T12:00:00");
        const b = new Date(after.endDate + "T12:00:00");
        if (!isNaN(a) && !isNaN(b)) days = Math.max(1, Math.round((b - a) / 86400000) + 1);
      }
      body = `Sayın ${uName}, ${days} günlük izin talebiniz ${verdict}.`;
    } else {
      title = "Saat Düzenleme Talebi";
      body = `Sayın ${uName}, ${after.dateKey || "—"} günü için saat düzenleme talebiniz ${verdict}.`;
    }
    await sendToToken(token, {
      title,
      body,
      data: { ct: "request_resolved", requestId, status: after.status, reqType: after.type || "" },
    });
  }
});

// ── Diyanet dini günler (resmi vakit hesaplama sitesi) ──
const https = require("https");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const TR_MONTHS_DIYANET = {
  OCAK: 1, ŞUBAT: 2, SUBAT: 2, MART: 3, NİSAN: 4, NISAN: 4, MAYIS: 5,
  HAZİRAN: 6, HAZIRAN: 6, TEMMUZ: 7, AĞUSTOS: 8, AGUSTOS: 8, EYLÜL: 9,
  EKİM: 10, EKIM: 10, KASIM: 11, ARALIK: 12,
};

function stripDiyanetHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDiyanetMonthYear(raw, fallbackYear) {
  const t = stripDiyanetHtml(raw)
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/ı/g, "I");
  const m = t.match(/([A-ZÇĞÖŞÜ]+)\s*[-–]?\s*(\d{4})/);
  if (!m) return null;
  const key = m[1]
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
  const mon = TR_MONTHS_DIYANET[key] || TR_MONTHS_DIYANET[m[1]];
  if (!mon) return null;
  return { month: mon, year: parseInt(m[2], 10) || fallbackYear };
}

function parseDiyanetHolidayHtml(html, wantYear) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(html)) !== null) {
    const chunk = tr[1];
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(chunk)) !== null) tds.push(stripDiyanetHtml(td[1]));
    if (tds.length < 7) continue;
    const name = tds[6];
    if (!name || /^\.+$/.test(name.replace(/\s/g, ""))) continue;
    const day = parseInt(tds[3], 10);
    const my = parseDiyanetMonthYear(tds[4], wantYear);
    if (!day || !my || my.year !== wantYear) continue;
    const date = `${my.year}-${String(my.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    rows.push({ date, name, kind: "dini" });
  }
  return rows;
}

function httpsGetText(url, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; LPerson/1.0)" } },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function fetchDiyanetHolidayRows(year) {
  const urls = [
    `https://vakithesaplama.diyanet.gov.tr/dinigunler.php?yil=${year}`,
    `https://vakithesaplama.diyanet.gov.tr/icerik.php?icerik=${152 + year - 2025}`,
  ];
  let lastErr = null;
  for (const url of urls) {
    try {
      const html = await httpsGetText(url);
      const rows = parseDiyanetHolidayHtml(html, year);
      if (rows.length >= 5) return rows;
      lastErr = new Error("yetersiz satır");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Diyanet yanıt vermedi");
}

exports.fetchDiyanetHolidays = onCall(async (request) => {
  // Uygulama Firestore kullanıcı/şifre ile giriş yapar; Firebase Auth oturumu yok.
  // Diyanet verisi herkese açık — kimlik doğrulama zorunlu değil.
  const year = parseInt(request.data?.year, 10) || new Date().getFullYear();
  if (!Number.isFinite(year) || year < 2020 || year > 2035) {
    throw new HttpsError("invalid-argument", "Geçersiz yıl.");
  }
  try {
    const rows = await fetchDiyanetHolidayRows(year);
    return { year, rows, fetchedAt: Date.now() };
  } catch (e) {
    console.warn("fetchDiyanetHolidays", year, e?.message || e);
    throw new HttpsError("unavailable", "Diyanet takvimi şu an alınamadı. Biraz sonra tekrar deneyin.");
  }
});

// ── Şifre sıfırlama (OTP / telefon doğrulama — yalnızca sunucuda şifre yazılır) ──
const crypto = require("crypto");

const OTP_PEPPER = process.env.OTP_PEPPER || "lperson-reset-v1";

function normalizePhoneDigitsTr(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("90") && d.length >= 11) d = d.slice(2);
  while (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(-10);
  return d;
}

function otpHash(uid, code) {
  return crypto.createHash("sha256").update(`${uid}:${String(code).trim()}:${OTP_PEPPER}`).digest("hex");
}

async function findUserByPhoneDigits(phoneDigits) {
  const qs = await admin.firestore().collection("users").get();
  const matches = [];
  qs.forEach((doc) => {
    const ten = normalizePhoneDigitsTr(doc.data().phone);
    if (ten === phoneDigits) matches.push({ id: doc.id, data: doc.data() });
  });
  return matches;
}

exports.requestPasswordReset = onCall(async (request) => {
  const phoneDigits = normalizePhoneDigitsTr(request.data?.phoneDigits);
  const smsOnly = request.data?.smsOnly === true;
  if (phoneDigits.length !== 10 || phoneDigits[0] !== "5") {
    throw new HttpsError("invalid-argument", "Geçerli Türkiye cep numarası girin.");
  }
  const matches = await findUserByPhoneDigits(phoneDigits);
  if (matches.length === 0) {
    throw new HttpsError("not-found", "Bu numaraya kayıtlı hesap yok.");
  }
  if (matches.length > 1) {
    throw new HttpsError("failed-precondition", "Bu numara birden fazla hesapta.");
  }
  const uid = matches[0].id;
  const user = matches[0].data;
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const code = String(100000 + Math.floor(Math.random() * 900000));

  const resetRef = admin.firestore().doc(`passwordResets/${uid}`);

  if (smsOnly) {
    await resetRef.set({
      expiresAt,
      phoneDigits,
      method: "firebase_phone",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, uid, method: "firebase_phone" };
  }

  // Yalnızca çıkışta kaydedilen resetFcmToken — aktif oturum fcmToken'ına şifre kodu gönderilmez
  const preferAppPush = request.data?.preferAppPush === true;
  const resetToken = user.resetFcmToken ? String(user.resetFcmToken).trim() : "";

  const activeFcm = user.fcmToken ? String(user.fcmToken).trim() : "";
  if (!smsOnly && preferAppPush && activeFcm) {
    return { ok: true, uid, method: "firebase_phone", sessionActive: true };
  }

  if (!smsOnly && preferAppPush && !resetToken) {
    return { ok: true, uid, method: "firebase_phone", noResetToken: true };
  }

  if (!smsOnly && preferAppPush && resetToken) {
    await resetRef.set({
      otpHash: otpHash(uid, code),
      expiresAt,
      phoneDigits,
      method: "fcm",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    try {
      await admin.messaging().send({
        token: resetToken,
        notification: {
          title: "lPerson şifre kodu",
          body: `Doğrulama kodunuz: ${code} (10 dk geçerli)`,
        },
        data: { ct: "password_reset", uid },
      });
      return { ok: true, uid, method: "fcm" };
    } catch (e) {
      console.warn("FCM password reset failed", e.message);
      await resetRef.delete().catch(() => {});
      return { ok: true, uid, method: "firebase_phone", noResetToken: true };
    }
  }

  return { ok: true, uid, method: "firebase_phone", noResetToken: true };
});

exports.confirmPasswordResetOtp = onCall(async (request) => {
  const uid = String(request.data?.uid || "").trim();
  const code = String(request.data?.code || "").trim();
  const newPassword = String(request.data?.newPassword || "");
  if (!uid || !code || code.length < 6) {
    throw new HttpsError("invalid-argument", "Geçerli doğrulama kodu girin.");
  }
  if (!newPassword || newPassword.length < 4) {
    throw new HttpsError("invalid-argument", "Şifre en az 4 karakter olmalı.");
  }
  const doc = await admin.firestore().doc(`passwordResets/${uid}`).get();
  if (!doc.exists) {
    throw new HttpsError("failed-precondition", "Önce kod isteyin.");
  }
  const data = doc.data();
  if (data.method !== "fcm") {
    throw new HttpsError("failed-precondition", "SMS doğrulaması gerekli.");
  }
  if (Date.now() > data.expiresAt) {
    throw new HttpsError("deadline-exceeded", "Kodun süresi doldu. Yeni kod isteyin.");
  }
  if (otpHash(uid, code) !== data.otpHash) {
    throw new HttpsError("permission-denied", "Kod hatalı.");
  }
  await admin.firestore().doc(`users/${uid}`).update({ password: newPassword });
  await doc.ref.delete();
  return { ok: true };
});

exports.finalizePasswordResetPhone = onCall(async (request) => {
  if (!request.auth?.token?.phone_number) {
    throw new HttpsError("unauthenticated", "Telefon doğrulaması gerekli.");
  }
  const uid = String(request.data?.uid || "").trim();
  const newPassword = String(request.data?.newPassword || "");
  if (!uid || !newPassword || newPassword.length < 4) {
    throw new HttpsError("invalid-argument", "Geçersiz istek.");
  }
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Kullanıcı bulunamadı.");
  }
  const userTen = normalizePhoneDigitsTr(userDoc.data().phone);
  const authTen = normalizePhoneDigitsTr(request.auth.token.phone_number);
  if (!userTen || userTen !== authTen) {
    throw new HttpsError("permission-denied", "Telefon numarası eşleşmiyor.");
  }
  const resetDoc = await admin.firestore().doc(`passwordResets/${uid}`).get();
  if (!resetDoc.exists || resetDoc.data().method !== "firebase_phone") {
    throw new HttpsError("failed-precondition", "Önce SMS kodu isteyin.");
  }
  if (Date.now() > resetDoc.data().expiresAt) {
    throw new HttpsError("deadline-exceeded", "İşlem süresi doldu.");
  }
  await admin.firestore().doc(`users/${uid}`).update({ password: newPassword });
  await resetDoc.ref.delete();
  return { ok: true };
});
