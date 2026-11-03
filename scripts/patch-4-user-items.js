const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(file, "utf8");

function rep(from, to, label) {
  if (!h.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  h = h.replace(from, to);
  console.log("OK:", label);
}

// 1 — Shift plan worker names full width
rep(
  `      .shift-plan-scroll .shift-plan-table > thead > tr > th:first-child,
      .shift-plan-scroll .shift-plan-table > tbody > tr > td:first-child { min-width:96px !important; max-width:120px; }`,
  `      .shift-plan-scroll .shift-plan-table > thead > tr > th:first-child,
      .shift-plan-scroll .shift-plan-table > tbody > tr > td:first-child { min-width:148px !important; max-width:220px; width:148px; }
      .shift-plan-scroll .splan-worker-name {
        font-size: 12px; font-weight: 700; color: var(--text);
        white-space: normal !important; word-break: break-word;
        overflow: visible !important; text-overflow: unset !important; max-width: none !important;
        line-height: 1.25;
      }`,
  "splan-css"
);

rep(
  `<td style="padding:8px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--bg);z-index:2;min-width:96px;">
            <motion.div style="display:flex;align-items:center;gap:8px;">
              <div style="width:30px;height:30px;border-radius:50%;background:${col}22;color:${col};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${init}</div>
              <div style="min-width:0;">
                <div class="splan-worker-name" style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:78px;">${escHtml(w.name)}</div>`,
  `<td style="padding:8px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--bg);z-index:2;min-width:148px;max-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <motion.div style="width:30px;height:30px;border-radius:50%;background:${col}22;color:${col};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${init}</div>
              <div style="min-width:0;flex:1;">
                <div class="splan-worker-name">${escHtml(w.name)}</div>`,
  "splan-html"
);

// fix motion typos if any
h = h.replace(/<motion\.div/g, "<motion.div").replace(/<\/motion\.div>/g, "</motion.div>");

// Re-fix splan html - I may have introduced motion.div by mistake
h = h.replace(
  `<td style="padding:8px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--bg);z-index:2;min-width:148px;max-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <motion.div style="width:30px`,
  `<td style="padding:8px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--bg);z-index:2;min-width:148px;max-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:30px`
);

if (!h.includes("_maybeNotifyPatronOneTimeTaskDone")) {
  rep(
    `          _maybeNotifyWorkerNewOneTimeTask(uid, prev, incoming);
          DB.tasklists[uid] = incoming;`,
    `          _maybeNotifyWorkerNewOneTimeTask(uid, prev, incoming);
          _maybeNotifyPatronOneTimeTaskDone(uid, prev, incoming);
          DB.tasklists[uid] = incoming;`,
    "task-unsub-done"
  );

  rep(
    `    function _maybeNotifyWorkerNewOneTimeTask(uid, prevData, nextData) {`,
    `    function _maybeNotifyPatronOneTimeTaskDone(uid, prevData, nextData) {
      if (_tasksNotifBoot || currentUser?.role !== "patron") return;
      const w = DB.users.find(u => u.id === uid);
      if (!w || w.companyId !== currentUser.companyId) return;
      const notified = new Set();
      forEachTaskInStore(nextData, nt => {
        if (!nt?.rangeId || !nt?.id || notified.has(nt.id)) return;
        let pt = null;
        forEachTaskInStore(prevData, t => { if (t.id === nt.id) pt = t; });
        if (!nt.done || pt?.done || nt.pendingApproval) return;
        notified.add(nt.id);
        void notifyDeviceNow(
          "Görev Tamamlandı",
          \`\${w.name}, "\${String(nt.text || "").slice(0, 60)}" tek seferlik görevi tamamladı.\`,
          "ct-task-done-" + uid + "-" + nt.id
        );
      });
    }

    function _maybeNotifyWorkerNewOneTimeTask(uid, prevData, nextData) {`,
    "patron-task-done-fn"
  );
}

// 3 — Overtime icon + PDF scard alignment
rep(
  `    function overtimeIconHtml(size) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      return '<img class="fmt-ot-icon" src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="display:inline-block;object-fit:contain;background:transparent;filter:brightness(0) invert(0.9);"/>';
    }`,
  `    function overtimeIconHtml(size, darkIcon) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      const flt = darkIcon ? "filter:brightness(0);" : "filter:brightness(0) invert(0.9);";
      return '<img class="fmt-ot-icon" src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="display:inline-block;object-fit:contain;background:transparent;' + flt + '"/>';
    }`,
  "ot-icon"
);

rep(
  `    function fmtOvertimeUi(h, size) {
      if (!(h > 0)) return "—";
      return '<span class="fmt-ot-wrap"><span class="fmt-ot-val">' + Number(h).toFixed(1) + 's</span>' + overtimeIconHtml(size || 14) + '</span>';
    }
    function fmtOvertimePdf(h, size) {
      if (!(h > 0)) return "—";
      return '<span class="fmt-ot-wrap"><span class="fmt-ot-val">' + h.toFixed(2) + 's</span>' + overtimeIconHtml(size || 14) + '</span>';
    }`,
  `    function fmtOvertimeUi(h, size) {
      if (!(h > 0)) return "—";
      const dark = document.documentElement.getAttribute("data-theme") === "light";
      return '<span class="fmt-ot-wrap"><span class="fmt-ot-val">' + Number(h).toFixed(1) + 's</span>' + overtimeIconHtml(size || 14, dark) + '</span>';
    }
    function fmtOvertimePdf(h, size) {
      if (!(h > 0)) return "—";
      return '<span class="fmt-ot-wrap fmt-ot-pdf"><span class="fmt-ot-val">' + h.toFixed(2) + 's</span>' + overtimeIconHtml(size || 14, true) + '</span>';
    }`,
  "fmt-ot"
);

if (!h.includes(".fmt-ot-pdf")) {
  rep(
    `    .fmt-ot-wrap .fmt-ot-icon { flex-shrink: 0; display: block; vertical-align: middle; }`,
    `    .fmt-ot-wrap .fmt-ot-icon { flex-shrink: 0; display: block; vertical-align: middle; }
    .fmt-ot-pdf .fmt-ot-icon { filter: brightness(0) !important; }`,
    "ot-pdf-css"
  );
}

rep(
  `      const scard = (label,value,col) =>
        \`<div style="text-align:right;">
           <div style="font-size:9px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">\${label}</motion.div>
           <div style="font-size:15px;font-weight:800;color:\${col};letter-spacing:-.3px;margin-top:1px;">\${value}</div>
         </div>\`;`,
  `      const scard = (label,value,col) =>
        \`<motion.div style="text-align:right;min-width:78px;">
           <div style="font-size:9px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">\${label}</div>
           <div style="font-size:15px;font-weight:800;color:\${col};letter-spacing:-.3px;margin-top:2px;min-height:22px;display:flex;align-items:center;justify-content:flex-end;line-height:1.15;">\${value}</div>
         </div>\`;`,
  "scard"
);

// fix scard if motion.div typo
h = h.replace(
  `<motion.div style="text-align:right;min-width:78px;">
           <div style="font-size:9px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">\${label}</div>
           <div style="font-size:15px;font-weight:800;color:\${col};letter-spacing:-.3px;margin-top:2px;min-height:22px;display:flex;align-items:center;justify-content:flex-end;line-height:1.15;">\${value}</div>
         </div>`,
  `<motion.div style="text-align:right;min-width:78px;">
           <div style="font-size:9px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">\${label}</div>
           <div style="font-size:15px;font-weight:800;color:\${col};letter-spacing:-.3px;margin-top:2px;min-height:22px;display:flex;align-items:center;justify-content:flex-end;line-height:1.15;">\${value}</div>
         </motion.div>`
);
h = h.replace(/<motion\.div style="text-align:right;min-width:78px;">/g, '<div style="text-align:right;min-width:78px;">');
h = h.replace(/<\/motion\.motion\.motion\.div>\`;/g, '</motion.div>`;');
h = h.replace(/<\/motion\.div>\`;\s*\n\s*\/\* ── worker blocks/g, '</div>`;\n\n      /* ── worker blocks');

rep(
  `            <div style="display:flex;gap:16px;align-items:flex-end;">`,
  `            <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">`,
  "scard-row-align"
);

// 4 — Button title case helper + launchApp call
if (!h.includes("function applyButtonTitleCase")) {
  rep(
    `    function notifFormatTitle(str) {`,
    `    function uiBtnLabel(str) {
      return notifFormatTitle(String(str || "").trim());
    }
    function applyButtonTitleCase(root) {
      const scope = root || document;
      scope.querySelectorAll("button.btn, button.quick-btn, button[class*='btn-']").forEach(el => {
        const raw = (el.textContent || "").trim();
        if (!raw || raw.length > 52) return;
        if (/^(GİRİŞ YAP|Koyu|Açık|PDF|◀|▶|Ekle)$/i.test(raw)) return;
        const words = raw.replace(/\\s+/g, " ").split(" ").filter(Boolean);
        if (words.length < 2) return;
        const m = raw.match(/^(\\+\\s*|PNG —\\s*)/);
        const prefix = m ? m[1] : "";
        const body = raw.slice(prefix.length);
        if (!body || /[a-zçğıöşü]/.test(body) === false) return;
        const titled = uiBtnLabel(body);
        if (titled && titled !== body) el.textContent = prefix + titled;
      });
    }
    function notifFormatTitle(str) {`,
    "btn-titlecase"
  );

  rep(
    `    function launchApp() {
      applyUiThemePrefs();
      void migrateHideWorkerTodayEarnToPerUser();`,
    `    function launchApp() {
      applyUiThemePrefs();
      applyButtonTitleCase();
      void migrateHideWorkerTodayEarnToPerUser();`,
    "launch-btns"
  );
}

// Static button label fixes
const btnFixes = [
  [">Çıkış yap<", ">Çıkış Yap<"],
  [">Girişe dön<", ">Girişe Dön<"],
  [">Varsayılana dön<", ">Varsayılana Dön<"],
  [">Bildirimleri sıfırla<", ">Bildirimleri Sıfırla<"],
  [">+ İzin talebi<", ">+ İzin Talebi<"],
  [`>İşten çıkar<`, `>İşten Çıkar<`],
  [`>Tekrar işe al<`, `>Tekrar İşe Al<`],
  [`>Seçilen tarihle işe al<`, `>Seçilen Tarihle İşe Al<`],
  [`>Tüm görevleri kaydet<`, `>Tüm Görevleri Kaydet<`],
  [`>Bu Hafta<`, `>Bu Hafta<`],
];
btnFixes.forEach(([a, b]) => {
  if (h.includes(a)) h = h.replaceAll(a, b);
});

fs.writeFileSync(file, h);
console.log("Done");
