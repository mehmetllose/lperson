const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
h = h.replace(/<motion\.div class="emp-mini-stat-l">Fazla Mesai Saati<\/motion\.motion\.div>/g, '<div class="emp-mini-stat-l">Fazla Mesai Saati</div>');
h = h.replace(/<motion\.div class="emp-mini-stat-l">Fazla Mesai Saati<\/motion\.div>/g, '<div class="emp-mini-stat-l">Fazla Mesai Saati</div>');
fs.writeFileSync(p, h);
console.log("motion.div left:", h.includes("motion.div"));
