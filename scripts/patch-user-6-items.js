const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(file, "utf8");

function mustReplace(from, to, label) {
  if (!html.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  html = html.replace(from, to);
  console.log("OK:", label);
}

// 1 — Shift notification: drop largeBody prefix
mustReplace(
  `          let title, body, largeBody;
          if (kind === "in") {
            title = notifFormatTitle("Mesainiz başlıyor");
            body = notifFormatBody(\`Sayın \${nm}, mesainiz başlamak üzere. Giriş yapmayı unutmayın.\`);
            largeBody = notifFormatBody(\`\${displayLabel} planlı aralık: \${st || "?"} – \${en || "?"}. \${body}\`);
          } else {
            title = notifFormatTitle("Mesainiz bitiyor");
            body = notifFormatBody(\`Sayın \${nm}, mesainiz bitmek üzere. Çıkış yapmayı unutmayın.\`);
            largeBody = notifFormatBody(\`\${displayLabel} planlı aralık: \${st || "?"} – \${en || "?"}. \${body}\`);
          }
          notifications.push({
            id,
            title,
            body,
            largeBody,`,
  `          let title, body;
          if (kind === "in") {
            title = notifFormatTitle("Mesainiz başlıyor");
            body = notifFormatBody(\`Sayın \${nm}, mesainiz başlamak üzere. Giriş yapmayı unutmayın.\`);
          } else {
            title = notifFormatTitle("Mesainiz bitiyor");
            body = notifFormatBody(\`Sayın \${nm}, mesainiz bitmek üzere. Çıkış yapmayı unutmayın.\`);
          }
          notifications.push({
            id,
            title,
            body,`,
  "shift-notif"
);

// 2 — Worker new one-time task notification
mustReplace(
  `          _maybeNotifyPatronTaskPending(uid, prev, incoming);
          _maybeNotifyWorkerTaskResolved(uid, prev, incoming);
          DB.tasklists[uid] = incoming;`,
  `          _maybeNotifyPatronTaskPending(uid, prev, incoming);
          _maybeNotifyWorkerTaskResolved(uid, prev, incoming);
          _maybeNotifyWorkerNewOneTimeTask(uid, prev, incoming);
          DB.tasklists[uid] = incoming;`,
  "task-unsub"
);

if (!html.includes("_maybeNotifyWorkerNewOneTimeTask")) {
  mustReplace(
    `    function renderTasksPatronPage() {
      const root = document.getElementById("tasks-patron-root");`,
    `    function _maybeNotifyWorkerNewOneTimeTask(uid, prevData, nextData) {
      if (_tasksNotifBoot || currentUser?.role !== "calisan" || currentUser.id !== uid) return;
      const nm = (currentUser?.name || "Personel").trim();
      const prevIds = new Set();
      forEachTaskInStore(prevData, t => { if (t?.id) prevIds.add(t.id); });
      const notified = new Set();
      forEachTaskInStore(nextData, nt => {
        if (!nt?.rangeId || !nt?.id || prevIds.has(nt.id) || notified.has(nt.id)) return;
        notified.add(nt.id);
        void notifyDeviceNow(
          "Yeni Görev",
          \`Sayın \${nm}, tarafınıza yeni bir görev atanmıştır. Detaylar için uygulamayı kontrol ediniz.\`,
          "ct-mytask-new-" + nt.id
        );
        pushWorkerFeed({ title: "Yeni görev", body: String(nt.text || "").slice(0, 120), kind: "task_new" });
      });
    }

    function renderTasksPatronPage() {
      const root = document.getElementById("tasks-patron-root");`,
    "worker-new-task-fn"
  );
}

// 3 — Compact one-time panel
mustReplace(
  `    .tasks-onetime-form { display: grid; gap: 10px; margin-bottom: 14px; }
    @media (min-width: 520px) {
      .tasks-onetime-form { grid-template-columns: 1fr 1fr; align-items: end; }
      .tasks-onetime-form .tasks-ot-span2 { grid-column: 1 / -1; }
    }`,
  `    .tasks-onetime-form {
      display: grid; gap: 6px; margin-bottom: 8px;
      padding: 8px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px;
    }
    .tasks-onetime-form label { font-size: 10px; margin-bottom: 2px; }
    .tasks-onetime-form select,
    .tasks-onetime-form input[type="date"],
    .tasks-onetime-form input[type="text"] { padding: 5px 8px !important; font-size: 12px !important; }
    .tasks-onetime-form .tasks-ot-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tasks-onetime-card-hd { font-size: 13px; font-weight: 800; margin-bottom: 4px; }
    .tasks-onetime-card-sub { font-size: 10px; color: var(--text3); margin-bottom: 6px; line-height: 1.35; }
    @media (min-width: 520px) {
      .tasks-onetime-form { grid-template-columns: minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(140px, 1.4fr) auto; align-items: end; }
      .tasks-onetime-form .tasks-ot-span2 { grid-column: auto; }
    }`,
  "onetime-css"
);

mustReplace(
  `      const oneTimeBlock = \`<motion.div class="card" style="margin-bottom:12px;">
          <div class="section-hd" style="margin-bottom:8px;">Tek seferlik görevler</div>
          <motion.div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.45;">Başlangıç–bitiş tarihi aralığında tek seferlik görev ekleyin. Silme, düzenleme ve görev başına onay anahtarı buradan yapılır.</div>
          <div class="tasks-onetime-form">
            <div class="field" style="margin:0;"><label>Personel</label>
              <select id="tasks-ot-worker" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;">\${workerOpts}</select></div>
            <div class="tasks-ot-dates tasks-ot-span2" style="margin:0;">
              <div class="field" style="margin:0;"><label>Başlangıç</label>
                <input type="date" id="tasks-ot-date-start" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>
              <div class="field" style="margin:0;"><label>Bitiş</label>
                <input type="date" id="tasks-ot-date-end" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>
            </div>
            <div class="field tasks-ot-span2" style="margin:0;"><label>Görev</label>
              <input type="text" id="tasks-ot-text" placeholder="Örn. Depo sayımı yapılacak" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 11px;font-size:13px;"/></div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
              <div id="tasks-ot-na-switch" class="wsp-switch" onclick="this.classList.toggle('on')" style="cursor:pointer;" title="Tamamlanınca patron onayı"><motion.div class="wsp-switch-knob"></div></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="patronAddOneTimeTask()">Görev ekle</button>
            </div>
          </div>
          <div id="tasks-onetime-list">\${oneTimeList}</div>
        </motion.div>\`;`,
  `      const oneTimeBlock = \`<div class="card tasks-onetime-card" style="margin-bottom:10px;padding:10px 12px;">
          <div class="tasks-onetime-card-hd">Tek seferlik görevler</div>
          <div class="tasks-onetime-card-sub">Tarih aralığı · onay · düzenleme</div>
          <div class="tasks-onetime-form">
            <div class="field" style="margin:0;"><label>Personel</label>
              <select id="tasks-ot-worker" style="width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);">\${workerOpts}</select></div>
            <div class="field" style="margin:0;"><label>Başlangıç</label>
              <input type="date" id="tasks-ot-date-start" value="\${todayKey()}" style="width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);"/></div>
            <div class="field" style="margin:0;"><label>Bitiş</label>
              <input type="date" id="tasks-ot-date-end" value="\${todayKey()}" style="width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);"/></div>
            <div class="field tasks-ot-span2" style="margin:0;"><label>Görev</label>
              <input type="text" id="tasks-ot-text" placeholder="Görev metni" style="width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);"/></div>
            <div class="tasks-ot-actions">
              <div id="tasks-ot-na-switch" class="wsp-switch" onclick="this.classList.toggle('on')" style="cursor:pointer;" title="Onay"><div class="wsp-switch-knob"></div></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="patronAddOneTimeTask()">Ekle</button>
            </div>
          </div>
          <div id="tasks-onetime-list">\${oneTimeList}</div>
        </div>\`;`,
  "onetime-html"
);

// 4 — Holidays
mustReplace(
  `    function getTrReferenceHolidayRows() {
      __trHolDateSetCache = null;
      const rows = [];
      const fixedM = [
        ["01-01", "Yılbaşı"],
        ["04-23", "Ulusal Egemenlik ve Çocuk Bayramı"],
        ["05-01", "Emek ve Dayanışma Günü"],
        ["05-19", "Atatürk'ü Anma, Gençlik ve Spor Bayramı"],
        ["07-15", "Demokrasi ve Millî Birlik Günü"],
        ["08-30", "Zafer Bayramı"],
        ["10-29", "Cumhuriyet Bayramı"],
      ];
      [2024, 2025, 2026, 2027, 2028].forEach(y => {
        fixedM.forEach(([md, name]) => rows.push({ date: \`\${y}-\${md}\`, name }));
      });
      const dini = [
        ["2025-03-30", "Ramazan Bayramı (1)"], ["2025-03-31", "Ramazan Bayramı (2)"], ["2025-04-01", "Ramazan Bayramı (3)"],
        ["2025-06-06", "Kurban Bayramı Arife"], ["2025-06-07", "Kurban Bayramı (1)"], ["2025-06-08", "Kurban Bayramı (2)"], ["2025-06-09", "Kurban Bayramı (3)"],
        ["2026-03-20", "Ramazan Bayramı (tahm.)"], ["2026-03-21", "Ramazan Bayramı (tahm.)"], ["2026-03-22", "Ramazan Bayramı (tahm.)"],
        ["2026-05-26", "Kurban Bayramı (tahm.)"], ["2026-05-27", "Kurban Bayramı (tahm.)"], ["2026-05-28", "Kurban Bayramı (tahm.)"], ["2026-05-29", "Kurban Bayramı (tahm.)"],
        ["2027-03-10", "Ramazan Bayramı (tahm.)"], ["2027-03-11", "Ramazan Bayramı (tahm.)"], ["2027-03-12", "Ramazan Bayramı (tahm.)"],
        ["2027-05-16", "Kurban Bayramı (tahm.)"], ["2027-05-17", "Kurban Bayramı (tahm.)"], ["2027-05-18", "Kurban Bayramı (tahm.)"], ["2027-05-19", "Kurban Bayramı (tahm.)"],
      ];
      dini.forEach(([date, name]) => rows.push({ date, name }));
      return rows.sort((a, b) => a.date.localeCompare(b.date));
    }`,
  `    function getTrReferenceHolidayYears() {
      const y = new Date().getFullYear();
      return [y, y + 1, y + 2];
    }
    function getTrReferenceHolidayRows() {
      __trHolDateSetCache = null;
      const years = getTrReferenceHolidayYears();
      const yearSet = new Set(years);
      const rows = [];
      const fixedM = [
        ["01-01", "Yılbaşı"],
        ["04-23", "Ulusal Egemenlik ve Çocuk Bayramı"],
        ["05-01", "Emek ve Dayanışma Günü"],
        ["05-19", "Atatürk'ü Anma, Gençlik ve Spor Bayramı"],
        ["07-15", "Demokrasi ve Millî Birlik Günü"],
        ["08-30", "Zafer Bayramı"],
        ["10-29", "Cumhuriyet Bayramı"],
      ];
      years.forEach(y => {
        fixedM.forEach(([md, name]) => rows.push({ date: \`\${y}-\${md}\`, name }));
      });
      const dini = [
        ["2025-03-30", "Ramazan Bayramı (1)"], ["2025-03-31", "Ramazan Bayramı (2)"], ["2025-04-01", "Ramazan Bayramı (3)"],
        ["2025-06-06", "Kurban Bayramı Arife"], ["2025-06-07", "Kurban Bayramı (1)"], ["2025-06-08", "Kurban Bayramı (2)"], ["2025-06-09", "Kurban Bayramı (3)"],
        ["2026-03-20", "Ramazan Bayramı (tahm.)"], ["2026-03-21", "Ramazan Bayramı (tahm.)"], ["2026-03-22", "Ramazan Bayramı (tahm.)"],
        ["2026-05-26", "Kurban Bayramı (tahm.)"], ["2026-05-27", "Kurban Bayramı (tahm.)"], ["2026-05-28", "Kurban Bayramı (tahm.)"], ["2026-05-29", "Kurban Bayramı (tahm.)"],
        ["2027-03-10", "Ramazan Bayramı (tahm.)"], ["2027-03-11", "Ramazan Bayramı (tahm.)"], ["2027-03-12", "Ramazan Bayramı (tahm.)"],
        ["2027-05-16", "Kurban Bayramı (tahm.)"], ["2027-05-17", "Kurban Bayramı (tahm.)"], ["2027-05-18", "Kurban Bayramı (tahm.)"], ["2027-05-19", "Kurban Bayramı (tahm.)"],
        ["2028-02-05", "Ramazan Bayramı (tahm.)"], ["2028-02-06", "Ramazan Bayramı (tahm.)"], ["2028-02-07", "Ramazan Bayramı (tahm.)"],
        ["2028-04-23", "Kurban Bayramı (tahm.)"], ["2028-04-24", "Kurban Bayramı (tahm.)"], ["2028-04-25", "Kurban Bayramı (tahm.)"], ["2028-04-26", "Kurban Bayramı (tahm.)"],
      ];
      dini.forEach(([date, name]) => {
        const y = parseInt(date.slice(0, 4), 10);
        if (yearSet.has(y)) rows.push({ date, name });
      });
      return rows.sort((a, b) => a.date.localeCompare(b.date));
    }`,
  "holidays"
);

mustReplace(
  `              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Vardiya planında resmi tatil günleri mavi gösterilir. Kesin dini bayram tarihleri için resmi takvimi kullanın.</div>`,
  `              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Vardiya planında resmi tatil günleri mavi gösterilir. Tablo <b id="tr-holidays-year-span"></b> yıllarını kapsar. Dini bayramlarda (tahm.) yaklaşık tarihtir.</div>`,
  "holiday-hint"
);

// 5 — Overtime icon
mustReplace(
  `    function overtimeIconHtml(size) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      return '<img src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="vertical-align:middle;display:inline-block;object-fit:contain;background:transparent;filter:brightness(0) invert(0.9);"/>';
    }
    function fmtOvertimeUi(h, size) {
      if (!(h > 0)) return "—";
      return overtimeIconHtml(size || 14) + ' <span style="font-variant-numeric:tabular-nums;">' + Number(h).toFixed(1) + "s</span>";
    }
    function fmtOvertimePdf(h, size) {
      if (!(h > 0)) return "—";
      return overtimeIconHtml(size || 14) + ' <span style="font-variant-numeric:tabular-nums;">' + h.toFixed(2) + "s</span>";
    }`,
  `    function overtimeIconHtml(size) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      return '<img class="fmt-ot-icon" src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="display:inline-block;object-fit:contain;background:transparent;filter:brightness(0) invert(0.9);"/>';
    }
    function fmtOvertimeUi(h, size) {
      if (!(h > 0)) return "—";
      return '<span class="fmt-ot-wrap"><span class="fmt-ot-val">' + Number(h).toFixed(1) + 's</span>' + overtimeIconHtml(size || 14) + '</span>';
    }
    function fmtOvertimePdf(h, size) {
      if (!(h > 0)) return "—";
      return '<span class="fmt-ot-wrap"><span class="fmt-ot-val">' + h.toFixed(2) + 's</span>' + overtimeIconHtml(size || 14) + '</span>';
    }`,
  "overtime"
);

if (!html.includes(".fmt-ot-wrap")) {
  mustReplace(
    `    html {
      background: var(--bg);
      min-height: 100%;
      min-height: 100dvh;`,
    `    .fmt-ot-wrap {
      display: inline-flex; align-items: flex-start; gap: 4px;
      font-variant-numeric: tabular-nums; vertical-align: middle;
    }
    .fmt-ot-wrap .fmt-ot-icon { position: relative; top: -2px; flex-shrink: 0; }

    html {
      background: var(--bg);
      min-height: 100%;
      min-height: 100dvh;`,
    "ot-css"
  );
}

// 6 — Theme
if (!html.includes("ui-theme-settings-card")) {
  mustReplace(
    `      --sidebar-w: 340px;
    }

    * {`,
    `      --sidebar-w: 340px;
      --ui-brightness: 1;
    }

    html[data-theme="light"] {
      --bg: #ececec;
      --bg2: #f7f7f7;
      --bg3: #ffffff;
      --bg4: #f0f0f0;
      --border: #d8d8d8;
      --border2: #c8c8c8;
      --text: #1a1a1a;
      --text2: #555;
      --text3: #888;
      --text4: #bbb;
    }

    #app-screen, #auth-screen {
      filter: brightness(var(--ui-brightness, 1));
    }

    * {`,
    "theme-css"
  );

  mustReplace(
    `            <!-- Şifre Değiştir -->
            <div class="card">
              <div class="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Şifre Değiştir
              </div>`,
    `            <!-- Görünüm -->
            <motion.div class="card" id="ui-theme-settings-card">
              <div class="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                Görünüm
              </div>
              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Tema, parlaklık ve vurgu rengini kişiselleştirin.</div>
              <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
                <button type="button" class="btn btn-sm" id="ui-theme-dark-btn" onclick="setUiThemeMode('dark')">Koyu</button>
                <button type="button" class="btn btn-sm" id="ui-theme-light-btn" onclick="setUiThemeMode('light')">Açık</button>
              </div>
              <div class="field" style="margin-bottom:12px;">
                <label>Parlaklık <span id="ui-brightness-val" style="color:var(--accent);font-weight:700;">100%</span></label>
                <input type="range" id="ui-brightness-range" min="0.75" max="1.25" step="0.01" value="1" style="width:100%;accent-color:var(--accent);" oninput="onUiBrightnessInput(this.value)"/>
              </div>
              <div class="field" style="margin-bottom:4px;">
                <label>Tema rengi (vurgu)</label>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <input type="color" id="ui-accent-color" value="#f5a623" style="width:48px;height:36px;padding:2px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);cursor:pointer;" oninput="onUiAccentInput(this.value)"/>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="resetUiAccentColor()">Varsayılana dön</button>
                </div>
              </div>
            </div>

            <!-- Şifre Değiştir -->
            <div class="card">
              <div class="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Şifre Değiştir
              </div>`,
    "theme-card"
  );

  mustReplace(
    `    function loadSettingsPage() {
      if (currentUser?.role === "platformAdmin") return;`,
    `    const UI_PREFS_KEY = "ct_ui_prefs";
    function loadUiPrefs() {
      try {
        const raw = localStorage.getItem(UI_PREFS_KEY);
        if (!raw) return { theme: "dark", brightness: 1, accent: "" };
        const p = JSON.parse(raw);
        return {
          theme: p.theme === "light" ? "light" : "dark",
          brightness: Math.min(1.25, Math.max(0.75, Number(p.brightness) || 1)),
          accent: String(p.accent || "").trim(),
        };
      } catch (e) {
        return { theme: "dark", brightness: 1, accent: "" };
      }
    }
    function saveUiPrefs(p) {
      try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(p)); } catch (e) {}
    }
    function hexToRgb(hex) {
      const h = String(hex || "").replace("#", "");
      if (h.length !== 6) return null;
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    function shadeHex(hex, pct) {
      const c = hexToRgb(hex);
      if (!c) return hex;
      const f = (n) => Math.max(0, Math.min(255, Math.round(n + (pct < 0 ? n * pct : (255 - n) * pct))));
      const to = n => n.toString(16).padStart(2, "0");
      return "#" + to(f(c.r)) + to(f(c.g)) + to(f(c.b));
    }
    function applyUiThemePrefs() {
      const p = loadUiPrefs();
      const root = document.documentElement;
      root.setAttribute("data-theme", p.theme === "light" ? "light" : "dark");
      root.style.setProperty("--ui-brightness", String(p.brightness));
      const defAccent = "#f5a623";
      const accent = p.accent && /^#[0-9a-fA-F]{6}$/.test(p.accent) ? p.accent : defAccent;
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent2", shadeHex(accent, -0.12));
      const br = document.getElementById("ui-brightness-range");
      const bv = document.getElementById("ui-brightness-val");
      const ac = document.getElementById("ui-accent-color");
      const darkBtn = document.getElementById("ui-theme-dark-btn");
      const lightBtn = document.getElementById("ui-theme-light-btn");
      if (br) br.value = String(p.brightness);
      if (bv) bv.textContent = Math.round(p.brightness * 100) + "%";
      if (ac) ac.value = accent;
      if (darkBtn) darkBtn.className = "btn btn-sm " + (p.theme === "dark" ? "btn-primary" : "btn-secondary");
      if (lightBtn) lightBtn.className = "btn btn-sm " + (p.theme === "light" ? "btn-primary" : "btn-secondary");
    }
    function setUiThemeMode(mode) {
      const p = loadUiPrefs();
      p.theme = mode === "light" ? "light" : "dark";
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function onUiBrightnessInput(val) {
      const p = loadUiPrefs();
      p.brightness = Math.min(1.25, Math.max(0.75, Number(val) || 1));
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function onUiAccentInput(val) {
      const p = loadUiPrefs();
      p.accent = String(val || "").trim();
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function resetUiAccentColor() {
      const p = loadUiPrefs();
      p.accent = "";
      saveUiPrefs(p);
      applyUiThemePrefs();
    }

    function loadSettingsPage() {
      if (currentUser?.role === "platformAdmin") return;`,
    "theme-js"
  );

  mustReplace(
    `      document.getElementById("setting-username").value = currentUser.username || "";
      document.getElementById("setting-phone").value = currentUser.phone || "";

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler
      if (!isPatron) {`,
    `      document.getElementById("setting-username").value = currentUser.username || "";
      document.getElementById("setting-phone").value = currentUser.phone || "";
      applyUiThemePrefs();

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler
      if (!isPatron) {`,
    "settings-ui"
  );

  mustReplace(
    `      renderTurkeyHolidaysRefTable();
      renderNativePushSettings();
      syncQrGeoPatronUI();`,
    `      renderTurkeyHolidaysRefTable();
      const holSpan = document.getElementById("tr-holidays-year-span");
      if (holSpan) holSpan.textContent = getTrReferenceHolidayYears().join(", ");
      renderNativePushSettings();
      syncQrGeoPatronUI();`,
    "hol-span"
  );

  mustReplace(
    `    function launchApp() {
      void migrateHideWorkerTodayEarnToPerUser();`,
    `    function launchApp() {
      applyUiThemePrefs();
      void migrateHideWorkerTodayEarnToPerUser();`,
    "launch-ui"
  );

  mustReplace(
    `    tryAutoLogin();
    window.doLogin = doLogin;`,
    `    applyUiThemePrefs();
    tryAutoLogin();
    window.doLogin = doLogin;`,
    "boot-ui"
  );
}

html = html.replace(/<motion\.div/g, "<div").replace(/<\/motion\.motion\.div>/g, "</div>").replace(/<\/motion\.motion\.motion\.motion\.div>/g, "</div>");

fs.writeFileSync(file, html);
console.log("Done.");
