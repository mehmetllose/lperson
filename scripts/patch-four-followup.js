const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

if (!h.includes("hideSubscriptionBlockedScreen();\n      showAuthScreenForLogin")) {
  h = h.replace(
    "      showAuthScreenForLogin();",
    "      hideSubscriptionBlockedScreen();\n      showAuthScreenForLogin();"
  );
}

const otValOld =
  '{ label: "Fazla Mesai Saati", val: (() => { const oh = calcMonthOvertimeHours(worker.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })(), color: "#4ade80" },';
const otValNew =
  '{ label: "Fazla Mesai Saati", val: (() => { const oh = calcMonthOvertimeHours(worker.id, year, month); return oh > 0 ? fmtOvertimeUi(oh, 16) : "—"; })(), color: "#4ade80" },';
h = h.split(otValOld).join(otValNew);

h = h.replace(
  `<motion.div class="emp-mini-stat-l">Fazla Mesai Saati</div><div class="emp-mini-stat-v" style="color:#4ade80;">\${(() => { const oh = calcMonthOvertimeHours(w.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })()}</div>`,
  `<div class="emp-mini-stat-l">Fazla Mesai Saati</div><div class="emp-mini-stat-v" style="color:#4ade80;">\${(() => { const oh = calcMonthOvertimeHours(w.id, year, month); return oh > 0 ? fmtOvertimeUi(oh, 14) : "—"; })()}</div>`
);
h = h.replace(
  `<div class="emp-mini-stat-l">Fazla Mesai Saati</div><div class="emp-mini-stat-v" style="color:#4ade80;">\${(() => { const oh = calcMonthOvertimeHours(w.id, year, month); return oh > 0 ? oh.toFixed(1) + "s" : "—"; })()}</motion.div>`,
  `<div class="emp-mini-stat-l">Fazla Mesai Saati</div><div class="emp-mini-stat-v" style="color:#4ade80;">\${(() => { const oh = calcMonthOvertimeHours(w.id, year, month); return oh > 0 ? fmtOvertimeUi(oh, 14) : "—"; })()}</div>`
);

fs.writeFileSync(p, h);
console.log("followup ok");
