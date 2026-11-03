const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

const iconPath = "c:/Users/PC/Desktop/yv/public/overtime-icon-sm.png";
if (!fs.existsSync(iconPath)) {
  console.error("missing", iconPath);
  process.exit(1);
}
const OT_IMG = `data:image/png;base64,${fs.readFileSync(iconPath).toString("base64")}`;

if (!h.includes("function overtimeIconHtml")) {
  const insert = `    const OVERTIME_ICON_DATA = "${OT_IMG}";
    function overtimeIconHtml(size) {
      const s = size || 14;
      return '<img src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="vertical-align:middle;display:inline-block;object-fit:contain;"/>';
    }
    function fmtOvertimePdf(h, size) {
      if (!(h > 0)) return "—";
      return overtimeIconHtml(size || 14) + ' <span style="font-variant-numeric:tabular-nums;">' + h.toFixed(2) + "s</span>";
    }
`;
  h = h.replace(
    "    /** Ay içinde vardiya planına göre toplam fazla mesai (saat). */\n    function calcMonthOvertimeHours(uid, year, month) {",
    insert + "    /** Ay içinde vardiya planına göre toplam fazla mesai (saat). */\n    function calcMonthOvertimeHours(uid, year, month) {"
  );
}

h = h.replace(
  `        { label: "Saat Kazancı", val: cur + monthGross.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), color: "var(--accent)" },`,
  `        { label: "Fazla Mesai Saati", val: (() => { const oh = calcMonthOvertimeHours(worker.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })(), color: "#4ade80" },`
);
h = h.replace(
  `      if (overtimeDays > 0) statCards.push({ label: "Fazla Mesai", val: \`\${overtimeDays} gün\`, color: "#4ade80" });\n`,
  ""
);
h = h.replace(
  `        { label: "Saat Kazancı", val: cur + gross.toLocaleString("tr-TR", { minimumFractionDigits: 2 }), color: "var(--accent)" },`,
  `        { label: "Fazla Mesai Saati", val: (() => { const oh = calcMonthOvertimeHours(worker.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })(), color: "#4ade80" },`
);
h = h.replace(
  `        <div class="emp-mini-stat"><div class="emp-mini-stat-l">Saat Kazancı</div><div class="emp-mini-stat-v" style="color:var(--accent);">\${cur}\${grossHr.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</div></div>`,
  `        <div class="emp-mini-stat"><div class="emp-mini-stat-l">Fazla Mesai Saati</div><div class="emp-mini-stat-v" style="color:#4ade80;">\${(() => { const oh = calcMonthOvertimeHours(w.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })()}</div></div>`
);
h = h.replace(
  `            <motion.div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Kazanç</div>
              <div class="cost-summary-val" style="color:var(--green);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{maximumFractionDigits:0})}</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">En Çok Çalışan</div>`,
  `            <div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Kazanç</div>
              <div class="cost-summary-val" style="color:var(--green);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{maximumFractionDigits:0})}</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Fazla Mesai</div>
              <div class="cost-summary-val" style="color:#4ade80;">\${stats.reduce((a,s)=>a+s.totalOvertimeH,0).toFixed(1)}s</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">En Çok Çalışan</div>`
);
h = h.replace(
  `\${s.totalOvertimeH > 0 ? "+" + s.totalOvertimeH.toFixed(1) + "s" : "—"}`,
  `\${s.totalOvertimeH > 0 ? s.totalOvertimeH.toFixed(1) + "s" : "—"}`
);
h = h.replace(`        csv += \`Saat kazancı;;;\${cur}\${earn.toFixed(2)};;;\n\`;\n`, "");
h = h.replace(
  "ÖZET\\nÇalışan;Toplam Saat;Fazla mesai;Saat kazancı;Ek kazanç;Toplam kazanç;Avans;Net\\n",
  "ÖZET\\nÇalışan;Toplam Saat;Fazla mesai saati;Ek kazanç;Toplam kazanç;Avans;Net\\n"
);
h = h.replace(
  "data.forEach(({ w, totalH, earn, ekTotal, grossTotal, advTotal, net }) => {",
  "data.forEach(({ w, totalH, totalOvertimeH, ekTotal, grossTotal, advTotal, net }) => {"
);
h = h.replace(
  "csv += `${w.name};${totalH.toFixed(2)};${(totalOvertimeH||0).toFixed(2)};${earn.toFixed(2)};${ekTotal.toFixed(2)};${grossTotal.toFixed(2)};${advTotal.toFixed(2)};${net.toFixed(2)}\\n`;",
  "csv += `${w.name};${totalH.toFixed(2)};${(totalOvertimeH||0).toFixed(2)};${ekTotal.toFixed(2)};${grossTotal.toFixed(2)};${advTotal.toFixed(2)};${net.toFixed(2)}\\n`;"
);
h = h.replace(
  `\${totalOvertimeH > 0 ? scard("Fazla Mesai", "+"+fmtH(totalOvertimeH)+"s", "#0F766E") : ""}`,
  `\${scard("Fazla Mesai", fmtOvertimePdf(totalOvertimeH, 16), "#0F766E")}`
);
h = h.replace(
  `                <td style="padding:6px 8px;text-align:right;font-size:13px;font-weight:900;color:\${GRAY1};">\${fmtH(totalH)}<span style="font-size:9px;color:\${GRAY4};margin-left:2px;">s</span></td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:#0F766E;">\${totalOvertimeH > 0 ? "+"+fmtH(totalOvertimeH)+"s" : "—"}</td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:\${BLUE};">\${fmt(earn)}</td>
                <td></td>`,
  `                <td style="padding:6px 8px;text-align:right;font-size:13px;font-weight:900;color:\${GRAY1};">\${fmtH(totalH)}<span style="font-size:9px;color:\${GRAY4};margin-left:2px;">s</span>
                  \${totalOvertimeH > 0 ? '<motion.div style="font-size:9px;font-weight:600;color:#0F766E;margin-top:3px;display:flex;align-items:center;justify-content:flex-end;gap:4px;">'+fmtOvertimePdf(totalOvertimeH,12)+'</div>' : ''}</td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:\${BLUE};">\${fmt(grossTotal)}</td>
                <td></td>`
);
h = h.replace(/<motion\.div style="font-size:9px/g, '<div style="font-size:9px');
h = h.replace(
  `\${totalOvertimeH > 0 ? "+"+fmtH(totalOvertimeH)+"s" : "—"}`,
  `\${fmtOvertimePdf(totalOvertimeH, 12)}`
);
h = h.replace(
  `\${data.reduce((a,d)=>a+(d.totalOvertimeH||0),0) > 0 ? "+"+fmtH(data.reduce((a,d)=>a+(d.totalOvertimeH||0),0))+"s" : "—"}`,
  `\${fmtOvertimePdf(data.reduce((a,d)=>a+(d.totalOvertimeH||0),0), 12)}`
);

fs.writeFileSync(p, h);
console.log("patched", {
  icon: h.includes("overtimeIconHtml"),
  saatKazanci: (h.match(/Saat Kazancı/g) || []).length,
  saatKazanciCsv: h.includes("Saat kazancı"),
});
