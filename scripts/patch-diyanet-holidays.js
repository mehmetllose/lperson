const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const htmlOld = `              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Vardiya planında resmi tatil günleri mavi gösterilir. Tablo <b id="tr-holidays-year-span"></b> yıllarını kapsar. Dini bayramlarda (tahm.) yaklaşık tarihtir.</div>
              <div id="tr-holidays-ref-table"></div>`;

const htmlNew = `              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Vardiya planında resmi tatil ve dini bayram günleri mavi gösterilir. Tablo yalnızca <b id="tr-holidays-year-span"></b> yılını kapsar. Dini günler <a href="https://vakithesaplama.diyanet.gov.tr/dinigunler.php" target="_blank" rel="noopener" style="color:var(--accent);">Diyanet İşleri Başkanlığı</a> resmi sitesinden alınır.</div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                <button type="button" id="tr-holidays-refresh-btn" onclick="refreshTrHolidaysFromDiyanet()" style="background:var(--accent);color:#0f172a;border:none;border-radius:8px;padding:8px 14px;font-family:var(--font-display);font-weight:700;font-size:12px;cursor:pointer;">Yenile</button>
                <span id="tr-holidays-status" style="font-size:11px;color:var(--text3);"></span>
              </div>
              <div id="tr-holidays-ref-table"></div>`;

if (!html.includes(htmlOld)) {
  console.error("HTML block not found");
  process.exit(1);
}
html = html.replace(htmlOld, htmlNew);

const jsOld = `    function getTrReferenceHolidayYears() {
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
    }

    let __trHolDateSetCache = null;
    function isTurkeyPublicHolidayDateKey(dateKey) {
      if (!__trHolDateSetCache) {
        __trHolDateSetCache = new Set(getTrReferenceHolidayRows().map(r => r.date));
      }
      return __trHolDateSetCache.has(dateKey);
    }

    function renderTurkeyHolidaysRefTable() {
      const el = document.getElementById("tr-holidays-ref-table");
      if (!el) return;
      const holSpan = document.getElementById("tr-holidays-year-span");
      if (holSpan) holSpan.textContent = getTrReferenceHolidayYears().join(", ");
      const rows = getTrReferenceHolidayRows();
      const wdShort = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
      el.innerHTML = \`<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:280px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:var(--bg3);position:sticky;top:0;">
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tarih</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Gün</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);">Tatil</th>
          </tr></thead>
          <tbody>\${rows.map(r => {
            const d = new Date(r.date + "T12:00:00");
            const wd = wdShort[d.getDay()];
            return \`<tr style="border-top:1px solid var(--border);"><td style="padding:7px 10px;font-family:var(--font-display);font-weight:700;">\${r.date}</td><td style="padding:7px 10px;color:var(--text3);">\${wd}</td><td style="padding:7px 10px;">\${escHtml(r.name)}</td></tr>\`;
          }).join("")}</tbody>
        </table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.45;">Dini bayramlarda <b>(tahm.)</b> yazanlar yaklaşık tarihtir; kesin günler için Diyanet / resmi takvimi kullanın.</div>\`;
    }`;

const jsNew = `    function getTrHolidayYear() {
      return new Date().getFullYear();
    }
    function getTrReferenceHolidayYears() {
      return [getTrHolidayYear()];
    }
    const TR_FIXED_RESMI_HOLIDAYS = [
      ["01-01", "Yılbaşı"],
      ["04-23", "Ulusal Egemenlik ve Çocuk Bayramı"],
      ["05-01", "Emek ve Dayanışma Günü"],
      ["05-19", "Atatürk'ü Anma, Gençlik ve Spor Bayramı"],
      ["07-15", "Demokrasi ve Millî Birlik Günü"],
      ["08-30", "Zafer Bayramı"],
      ["10-29", "Cumhuriyet Bayramı"],
    ];
    function getTrResmiHolidayRowsForYear(y) {
      return TR_FIXED_RESMI_HOLIDAYS.map(([md, name]) => ({
        date: \`\${y}-\${md}\`, name, kind: "resmi",
      }));
    }
    function getDiyanetHolidayCache() {
      return getSettings().diyanetHolidays || null;
    }
    function isDiyanetHolidayShiftDay(name) {
      return /BAYRAM|AREFE/i.test(String(name || ""));
    }
    function getTrReferenceHolidayRows() {
      const y = getTrHolidayYear();
      const rows = getTrResmiHolidayRowsForYear(y);
      const cache = getDiyanetHolidayCache();
      if (cache && cache.year === y && Array.isArray(cache.rows)) {
        cache.rows.forEach(r => {
          if (r && r.date && r.name) rows.push({ date: r.date, name: r.name, kind: "dini" });
        });
      }
      return rows.sort((a, b) => a.date.localeCompare(b.date));
    }

    let __trHolDateSetCache = null;
    function isTurkeyPublicHolidayDateKey(dateKey) {
      if (!__trHolDateSetCache) {
        const keys = new Set();
        getTrReferenceHolidayRows().forEach(r => {
          if (r.kind === "resmi" || (r.kind === "dini" && isDiyanetHolidayShiftDay(r.name))) keys.add(r.date);
        });
        __trHolDateSetCache = keys;
      }
      return __trHolDateSetCache.has(dateKey);
    }

    function formatTrHolidaysFetchedAt(ts) {
      if (!ts) return "";
      try {
        return new Date(ts).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
      } catch (_) { return ""; }
    }

    function setTrHolidaysStatus(msg, isErr) {
      const el = document.getElementById("tr-holidays-status");
      if (!el) return;
      el.textContent = msg || "";
      el.style.color = isErr ? "#f87171" : "var(--text3)";
    }

    let __trHolidaysFetchBusy = false;
    async function refreshTrHolidaysFromDiyanet(opts) {
      const silent = !!(opts && opts.silent);
      const year = getTrHolidayYear();
      if (__trHolidaysFetchBusy) return false;
      if (!_functions) {
        if (!silent) showToast("Diyanet güncellemesi için bulut fonksiyonu gerekli.");
        setTrHolidaysStatus("Bulut fonksiyonu bağlı değil.", true);
        return false;
      }
      const btn = document.getElementById("tr-holidays-refresh-btn");
      __trHolidaysFetchBusy = true;
      if (btn) { btn.disabled = true; btn.style.opacity = "0.65"; }
      if (!silent) setTrHolidaysStatus("Diyanet'ten alınıyor…");
      try {
        const fn = _functions.httpsCallable("fetchDiyanetHolidays");
        const res = await fn({ year });
        const data = res && res.data;
        if (!data || !Array.isArray(data.rows)) throw new Error("Geçersiz yanıt");
        const s = getSettings();
        s.diyanetHolidays = { year: data.year || year, rows: data.rows, fetchedAt: data.fetchedAt || Date.now() };
        __trHolDateSetCache = null;
        await saveSettings();
        renderTurkeyHolidaysRefTable();
        const when = formatTrHolidaysFetchedAt(s.diyanetHolidays.fetchedAt);
        setTrHolidaysStatus(when ? \`\${year} güncellendi (\${when})\` : \`\${year} güncellendi\`);
        if (!silent) showToast("Bayram takvimi güncellendi ✓");
        return true;
      } catch (e) {
        console.warn("refreshTrHolidaysFromDiyanet", e);
        const msg = (e && (e.message || e.details)) ? String(e.message || e.details) : "Diyanet verisi alınamadı.";
        setTrHolidaysStatus(msg, true);
        if (!silent) showToast("Bayram takvimi güncellenemedi");
        renderTurkeyHolidaysRefTable();
        return false;
      } finally {
        __trHolidaysFetchBusy = false;
        if (btn) { btn.disabled = false; btn.style.opacity = ""; }
      }
    }

    async function ensureTrHolidaysForCurrentYear() {
      const y = getTrHolidayYear();
      const cache = getDiyanetHolidayCache();
      if (cache && cache.year === y && Array.isArray(cache.rows) && cache.rows.length) {
        const when = formatTrHolidaysFetchedAt(cache.fetchedAt);
        setTrHolidaysStatus(when ? \`Kayıtlı veri (\${when})\` : "Kayıtlı veri");
        return;
      }
      setTrHolidaysStatus("Dini günler yükleniyor…");
      await refreshTrHolidaysFromDiyanet({ silent: true });
    }

    function renderTurkeyHolidaysRefTable() {
      const el = document.getElementById("tr-holidays-ref-table");
      if (!el) return;
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

if (!html.includes(jsOld)) {
  console.error("JS block not found");
  process.exit(1);
}
html = html.replace(jsOld, jsNew);

const loadOld = `      renderTurkeyHolidaysRefTable();
      renderNativePushSettings();`;
const loadNew = `      renderTurkeyHolidaysRefTable();
      ensureTrHolidaysForCurrentYear();
      renderNativePushSettings();`;

if (!html.includes(loadOld)) {
  console.error("loadSettingsPage hook not found");
  process.exit(1);
}
html = html.replace(loadOld, loadNew);

fs.writeFileSync(indexPath, html, "utf8");
console.log("patched", indexPath);
