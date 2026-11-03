const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
if (h.includes("Toplam Fazla Mesai")) {
  console.log("already has card");
  process.exit(0);
}
const old = `            <div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Kazanç</div>
              <div class="cost-summary-val" style="color:var(--green);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{maximumFractionDigits:0})}</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">En Çok Çalışan</div>`;
const neu = `            <div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Kazanç</div>
              <div class="cost-summary-val" style="color:var(--green);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{maximumFractionDigits:0})}</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">Toplam Fazla Mesai</div>
              <div class="cost-summary-val" style="color:#4ade80;">\${stats.reduce((a,s)=>a+s.totalOvertimeH,0).toFixed(1)}s</div>
            </div>
            <div class="cost-summary-card">
              <div class="cost-summary-label">En Çok Çalışan</div>`;
if (!h.includes('cost-summary-label">Toplam Kazanç')) {
  console.error("anchor missing");
  process.exit(1);
}
h = h.replace(old, neu);
if (!h.includes("Toplam Fazla Mesai")) {
  // fallback without escaped dollars in file
  const old2 = old.replace(/\\\$/g, "$");
  const neu2 = neu.replace(/\\\$/g, "$");
  h = fs.readFileSync(p, "utf8").replace(old2, neu2);
}
fs.writeFileSync(p, h);
console.log("done", h.includes("Toplam Fazla Mesai"));
