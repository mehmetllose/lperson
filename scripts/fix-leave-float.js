const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
h = h.replace(
  /    \$\{leaveFloatHtml \? `<div class="day-row-leave-float">\$\{leaveFloatHtml\}<\/motion.div>` : ""\}\n/g,
  ""
);
h = h.replace(
  /    \$\{leaveFloatHtml \? `<div class="day-row-leave-float">\$\{leaveFloatHtml\}<\/motion.div>` : ""\}\r?\n/g,
  ""
);
h = h.replace(
  '${leaveFloatHtml ? `<div class="day-row-leave-float">${leaveFloatHtml}</div>` : ""}\n',
  ""
);
fs.writeFileSync(p, h);
console.log("ok", h.includes("leaveFloatHtml"));
