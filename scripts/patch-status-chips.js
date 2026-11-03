const fs = require("fs");
const path = "c:/Users/PC/Desktop/yv/public/index.html";
let s = fs.readFileSync(path, "utf8");
const needle = '          <div class="my-shift-title">Vardiya Planım</div>\n          ${navRow}';
const replacement = `          <div class="my-shift-title">Vardiya Planım</div>
          \${statusChips}
          \${navRow}`;
const chipsVar = `
      const statusChips = \`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
        <span class="splan-legend-chip splan-legend-working">Normal Mesai</span>
        <span class="splan-legend-chip" style="background:rgba(196,181,253,0.16);color:#c4b5fd;border-color:rgba(196,181,253,0.45);">Varsayılan Vardiya</span>
        <span class="splan-legend-chip splan-legend-blue">Resmi Tatil</span>
        <span class="splan-legend-chip splan-legend-holiday">Hafta Tatili</span>
        <span class="splan-legend-chip splan-legend-leave">Onaylı İzin</span>
      </div>\`;
`;
if (!s.includes(needle)) {
  console.error("needle not found");
  process.exit(1);
}
if (s.includes("const statusChips")) {
  console.log("already patched");
  process.exit(0);
}
s = s.replace(needle, replacement);
s = s.replace(
  '      root.innerHTML = `\n        <div class="my-shift-plan-wrap">',
  chipsVar + '\n      root.innerHTML = `\n        <div class="my-shift-plan-wrap">'
);
fs.writeFileSync(path, s);
console.log("ok");
