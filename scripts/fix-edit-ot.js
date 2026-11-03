const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
h = h.replace(
  '<div class="wsp-switch-knob"></motion.div>',
  '<div class="wsp-switch-knob"></div>'
);
fs.writeFileSync(p, h);
console.log("knob fixed", !h.includes('wsp-switch-knob"></motion.div>'));
