const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");

h = h.replace(
  /const OVERTIME_ICON_DATA[\s\S]*?function fmtOvertimePdf\(h, size\) \{[\s\S]*?\n    \}\n/,
  `function fmtOvertimeUi(h) {
      if (!(h > 0)) return "—";
      return Number(h).toFixed(1) + "s";
    }
    function fmtOvertimePdf(h) {
      if (!(h > 0)) return "—";
      return h.toFixed(2) + "s";
    }
`
);

h = h.replace(
  /\$\{overtimeIconHtml\(14\)\} Fazla Mesai:/g,
  "Fazla Mesai:"
);

h = h.replace(
  /\.fmt-ot-wrap \{[\s\S]*?\.stat-card \.stat-value \{\n      display: flex; align-items: center; min-height: 28px; flex-wrap: wrap;\n    \}\n\n/,
  ""
);

if (h.includes("OVERTIME_ICON_DATA")) {
  console.error("OVERTIME_ICON_DATA still present");
  process.exit(1);
}
fs.writeFileSync(p, h);
console.log("removed overtime icon");
