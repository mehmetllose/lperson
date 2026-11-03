const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

h = h.replace(
  `<motion.div class="alert alert-info" style="margin-bottom:14px;">Tarih veya tür değişince takvimdeki izin işaretleri güncellenir.</motion.div>`,
  `<div class="alert alert-info" style="margin-bottom:14px;">Tarih veya tür değişince takvimdeki izin işaretleri güncellenir.</div>`
);
h = h.replace(
  `<select id="patron-leave-type" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px 12px;">\${ltOpts}</select></motion.div>`,
  `<select id="patron-leave-type" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px 12px;">\${ltOpts}</select></div>`
);
// broken replace chain on template literal
h = h.replace(
  /`\.replace\(\/<\/?motion\.motion\.motion\.div\/g, ""\)\.replace\(\/<\/?motion\.motion\.motion\.motion\.div\/g, ""\)\.replace\(\/<\/?motion\.div\/g, \(m\) => m\.replace\("motion\.", ""\)\), \(\) => \{/,
  "`, () => {"
);
h = h.replace(
  /`\.replace\(\/<\/?motion\.motion\.div\/g, ""\)\.replace\(\/<\/?motion\.motion\.motion\.motion\.div\/g, ""\)\.replace\(\/<\/?motion\.motion\.div\/g, \(m\) => m\.replace\("motion\.", ""\)\), \(\) => \{/,
  "`, () => {"
);

fs.writeFileSync(p, h);
console.log("motion.div count:", (h.match(/motion\.div/g) || []).length);
