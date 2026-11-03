const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");
if (h.includes('class="day-right-stats"')) {
  console.log("already done");
  process.exit(0);
}
const re = /rightHtml = `<div style="text-align:right;">\s*<motion.div class="day-hours"[\s\S]*?<\/div>`;/;
// simpler: match the hours>0 block
const re2 = /(const earnColor = planHrRow \? "#a78bfa" : "var\(--text3\)";\s*)rightHtml = `<div style="text-align:right;">[\s\S]*?`\s*;/;
const neu = `$1rightHtml = \`<motion.div class="day-right-stats">
          <span class="day-stat-inline">
            <span class="day-hours" style="color:\${hasOpen ? "var(--accent)" : "var(--text2)"};">\${fmtH(hours)}</span>
            <span class="day-earn" style="color:\${earnColor};">\${fmtMoney(hours, rate, cur)}</span>
          </span>
          \${statusBadgeHtml || ""}
        </div>\`;`;
let neu2 = neu.replace(/motion\.div/g, "motion.DIV");
neu2 = neu2.replace(/motion\.DIV/g, "div");
if (!re2.test(h)) {
  const m = h.match(/rightHtml = `<div style="text-align:right;">[\s\S]{0,400}?<\/div>`;/);
  console.log("no match", m && m[0].slice(0, 200));
  process.exit(1);
}
h = h.replace(re2, neu2);
fs.writeFileSync(p, h);
console.log("ok");
