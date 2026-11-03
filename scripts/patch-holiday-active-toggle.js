const fs = require("fs");
const path = require("path");
const indexPath = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

function mustReplace(oldStr, newStr, label) {
  if (!html.includes(oldStr)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  html = html.replace(oldStr, newStr);
}

mustReplace(
  `Vardiya planında resmi tatil ve dini bayram günleri mavi gösterilir. Tablo yalnızca <b id="tr-holidays-year-span"></b> yılını kapsar. Dini günler <a id="tr-holidays-diyanet-link"`,
  `Vardiya planında <b>aktif</b> işaretli tatil günleri mavi gösterilir. Tablo yalnızca <b id="tr-holidays-year-span"></b> yılını kapsar. Dini günler <a id="tr-holidays-diyanet-link"`,
  "card description"
);

const helpers = `    function getTrHolidayActiveMap() {
      const y = String(getTrHolidayYear());
      const s = getSettings();
      if (!s.trHolidayActive) s.trHolidayActive = {};
      if (!s.trHolidayActive[y] || typeof s.trHolidayActive[y] !== "object") s.trHolidayActive[y] = {};
      return s.trHolidayActive[y];
    }
    function isTrHolidayActive(dateKey) {
      const map = getTrHolidayActiveMap();
      return map[dateKey] !== false;
    }
    function toggleTrHolidayActive(dateKey) {
      const map = getTrHolidayActiveMap();
      const next = map[dateKey] === false;
      if (next) delete map[dateKey];
      else map[dateKey] = false;
      getSettings().trHolidayActive[String(getTrHolidayYear())] = map;
      __trHolDateSetCache = null;
      saveSettings();
      renderTurkeyHolidaysRefTable();
      refreshTrHolidayShiftViews();
    }
    function refreshTrHolidayShiftViews() {
      if (currentPage === "shifts" && typeof renderShiftPlanPage === "function") renderShiftPlanPage();
      if (currentPage === "my-shifts" && typeof renderMyShiftsPage === "function") renderMyShiftsPage();
    }
`;

mustReplace(
  `    function getDiyanetHolidayCache() {
      return getSettings().diyanetHolidays || null;
    }
    function isDiyanetHolidayShiftDay(name) {
      return /BAYRAM|AREFE/i.test(String(name || ""));
    }`,
  `    function getDiyanetHolidayCache() {
      return getSettings().diyanetHolidays || null;
    }
${helpers}`,
  "holiday active helpers"
);

mustReplace(
  `    let __trHolDateSetCache = null;
    function isTurkeyPublicHolidayDateKey(dateKey) {
      if (!__trHolDateSetCache) {
        const keys = new Set();
        getTrReferenceHolidayRows().forEach(r => {
          if (r.kind === "resmi" || (r.kind === "dini" && isDiyanetHolidayShiftDay(r.name))) keys.add(r.date);
        });
        __trHolDateSetCache = keys;
      }
      return __trHolDateSetCache.has(dateKey);
    }`,
  `    let __trHolDateSetCache = null;
    function isTurkeyPublicHolidayDateKey(dateKey) {
      if (!__trHolDateSetCache) {
        const keys = new Set();
        getTrReferenceHolidayRows().forEach(r => {
          if (isTrHolidayActive(r.date)) keys.add(r.date);
        });
        __trHolDateSetCache = keys;
      }
      return __trHolDateSetCache.has(dateKey);
    }`,
  "isTurkeyPublicHolidayDateKey active only"
);

mustReplace(
  `        s.diyanetHolidays = { year: data.year || year, rows: data.rows, fetchedAt: data.fetchedAt || Date.now() };
        __trHolDateSetCache = null;
        await saveSettings();`,
  `        s.diyanetHolidays = { year: data.year || year, rows: data.rows, fetchedAt: data.fetchedAt || Date.now() };
        __trHolDateSetCache = null;
        await saveSettings();
        refreshTrHolidayShiftViews();`,
  "refresh after diyanet fetch"
);

// renderTurkeyHolidaysRefTable - replace whole function
const renderOld = `    function renderTurkeyHolidaysRefTable() {
      const el = document.getElementById("tr-holidays-ref-table");
      if (!el) return;
      syncTrHolidaysDiyanetLink();
      const holSpan = document.getElementById("tr-holidays-year-span");
      if (holSpan) holSpan.textContent = String(getTrHolidayYear());
      const rows = getTrReferenceHolidayRows();
      const cache = getDiyanetHolidayCache();
      const needDiyanet = !cache || cache.year !== getTrHolidayYear() || !Array.isArray(cache.rows) || !cache.rows.length;
      const wdShort = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
      const kindLabel = k => k === "resmi" ? "Resmi" : "Dini";
      el.innerHTML = needDiyanet
        ? '<div style="font-size:12px;color:var(--text3);padding:12px 0;">Dini günler henüz yüklenmedi. <b>Yenile</b> ile Diyanet sitesinden çekin.</div>'
        : \`<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:280px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:var(--bg3);position:sticky;top:0;">
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tarih</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Gün</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tür</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tatil</th>
          </tr></thead>
          <tbody>\${rows.map(r => {
            const d = new Date(r.date + "T12:00:00");
            const wd = wdShort[d.getDay()];
            const tag = r.kind === "resmi"
              ? '<span style="font-size:10px;font-weight:800;color:#38bdf8;">Resmi</span>'
              : '<span style="font-size:10px;font-weight:800;color:#a78bfa;">Dini</span>';
            return \`<tr style="border-top:1px solid var(--border);"><td style="padding:7px 10px;font-family:var(--font-display);font-weight:700;">\${r.date}</td><td style="padding:7px 10px;color:var(--text3);">\${wd}</td><td style="padding:7px 10px;">\${tag}</td><td style="padding:7px 10px;">\${escHtml(r.name)}</td></tr>\`;
          }).join("")}</tbody>
        </table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.45;">Vardiya planında mavi: resmi tatiller ve dini bayram / arife günleri. Kandil günleri yalnızca referans tablosunda gösterilir.</div>\`;
    }`;

const renderNew = `    function trHolidayTableRowHtml(r, wdShort) {
      const d = new Date(r.date + "T12:00:00");
      const wd = wdShort[d.getDay()];
      const on = isTrHolidayActive(r.date);
      const tag = r.kind === "resmi"
        ? '<span style="font-size:10px;font-weight:800;color:#38bdf8;">Resmi</span>'
        : '<span style="font-size:10px;font-weight:800;color:#a78bfa;">Dini</span>';
      const rowStyle = on ? "" : "opacity:0.55;";
      const sw = \`<div class="wsp-switch \${on ? "on" : ""}" onclick="toggleTrHolidayActive('\${r.date}')" style="cursor:pointer;flex-shrink:0;" title="Vardiya planında göster"><div class="wsp-switch-knob"></div></div>\`;
      return \`<tr style="border-top:1px solid var(--border);\${rowStyle ? " " + rowStyle : ""}"><td style="padding:7px 10px;font-family:var(--font-display);font-weight:700;">\${r.date}</td><td style="padding:7px 10px;color:var(--text3);">\${wd}</td><td style="padding:7px 10px;">\${tag}</td><td style="padding:7px 10px;">\${escHtml(r.name)}</td><td style="padding:7px 10px;text-align:center;">\${sw}</td></tr>\`;
    }
    function renderTurkeyHolidaysRefTable() {
      const el = document.getElementById("tr-holidays-ref-table");
      if (!el) return;
      syncTrHolidaysDiyanetLink();
      const holSpan = document.getElementById("tr-holidays-year-span");
      if (holSpan) holSpan.textContent = String(getTrHolidayYear());
      const rows = getTrReferenceHolidayRows();
      const cache = getDiyanetHolidayCache();
      const needDiyanet = !cache || cache.year !== getTrHolidayYear() || !Array.isArray(cache.rows) || !cache.rows.length;
      const wdShort = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
      const resmiRows = rows.filter(r => r.kind === "resmi");
      const diniRows = rows.filter(r => r.kind === "dini");
      const tableHead = \`<thead><tr style="background:var(--bg3);position:sticky;top:0;">
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tarih</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Gün</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tür</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tatil</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text2);width:72px;">Aktif</th>
          </tr></thead>\`;
      let body = resmiRows.map(r => trHolidayTableRowHtml(r, wdShort)).join("");
      if (needDiyanet) {
        body += \`<tr><td colspan="5" style="padding:10px;color:var(--text3);font-size:11px;">Dini günler henüz yüklenmedi. <b>Yenile</b> ile Diyanet sitesinden çekin.</td></tr>\`;
      } else {
        body += diniRows.map(r => trHolidayTableRowHtml(r, wdShort)).join("");
      }
      el.innerHTML = \`<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:320px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          \${tableHead}
          <tbody>\${body}</tbody>
        </table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.45;">Aktif tatiller vardiya planında mavi «Resmi Tatil» olarak görünür. Pasif günler listede kalır ancak planda işaretlenmez.</div>\`;
    }`;

if (!html.includes(renderOld)) {
  console.error("renderTurkeyHolidaysRefTable block not found");
  process.exit(1);
}
html = html.replace(renderOld, renderNew);

fs.writeFileSync(indexPath, html, "utf8");
console.log("OK", indexPath);
