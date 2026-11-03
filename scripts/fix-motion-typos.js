const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
const before = (h.match(/motion\.div/g) || []).length;
h = h.split("motion.div").join("div");
h = h.split("</motion.div>").join("</div>");
fs.writeFileSync(p, h);
console.log("replaced", before, "occurrences");
