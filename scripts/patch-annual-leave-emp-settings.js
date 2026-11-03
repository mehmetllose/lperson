const fs = require("fs");
const path = "c:/Users/PC/Desktop/yv/public/index.html";
let s = fs.readFileSync(path, "utf8");

const annualBlock = `<div class="field">
      <label>Yıllık izin hakkı (gün)</label>
      <input type="number" id="emp-annual-leave-days" min="0" max="365" value="\${w.annualLeaveDays != null ? w.annualLeaveDays : 14}"/>
      <motion.div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.4;">Ana ekran ve izin özetindeki hakediş. Kullanılan: <b>\${countAnnualLeaveDaysUsed(uid)}</b> gün · Kalan: <b>\${Math.max(0, (w.annualLeaveDays != null ? w.annualLeaveDays : 14) - countAnnualLeaveDaysUsed(uid))}</b> gün</motion.div>
    </div>
    `.replace(/<motion\.div/g, "<motion.div").replace(/<\/motion\.div>/g, "</div>").replace(/<motion\.div/g, "<div");

if (!s.includes("emp-annual-leave-days")) {
  const marker = 'openModal("Personeli Düzenle"';
  const start = s.indexOf(marker);
  const addr = '<div class="field"><label>Adres (İsteğe Bağlı)</label><textarea id="emp-address" placeholder="Çalışanın adresi...">${escHtml(w.address || \'\')}</textarea></div>';
  const pos = s.indexOf(addr, start);
  if (pos < 0) { console.error("edit addr not found"); process.exit(1); }
  const cleanBlock = `<div class="field">
      <label>Yıllık izin hakkı (gün)</label>
      <input type="number" id="emp-annual-leave-days" min="0" max="365" value="\${w.annualLeaveDays != null ? w.annualLeaveDays : 14}"/>
      <div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.4;">Ana ekran ve izin özetindeki hakediş. Kullanılan: <b>\${countAnnualLeaveDaysUsed(uid)}</b> gün · Kalan: <b>\${Math.max(0, (w.annualLeaveDays != null ? w.annualLeaveDays : 14) - countAnnualLeaveDaysUsed(uid))}</b> gün</div>
    </div>
    `;
  s = s.slice(0, pos) + cleanBlock + s.slice(pos);
  console.log("inserted edit annual field");
}

if (!s.includes("annualLeaveDays, hideTodayEarn")) {
  const beforeAnnual = `        const address = document.getElementById("emp-address").value.trim();
        const weeklyOff = JSON.parse(document.getElementById("emp-wo-val").value || "[]");`;
  const afterAnnual = `        const address = document.getElementById("emp-address").value.trim();
        const annualLeaveDays = parseInt(document.getElementById("emp-annual-leave-days")?.value, 10);
        if (isNaN(annualLeaveDays) || annualLeaveDays < 0 || annualLeaveDays > 365) { showToast("Yıllık izin 0–365 gün arasında olmalı", "warn"); return false; }
        const weeklyOff = JSON.parse(document.getElementById("emp-wo-val").value || "[]");`;
  if (s.includes(beforeAnnual)) {
    s = s.replace(beforeAnnual, afterAnnual);
    s = s.replace(
      "hourlyRate: rate, phone, address, weeklyOff, color, hiddenMenuIds, hideTodayEarn:",
      "hourlyRate: rate, phone, address, weeklyOff, color, hiddenMenuIds, annualLeaveDays, hideTodayEarn:"
    );
    console.log("patched edit save");
  }
}

const addMarker = 'openModal("Personel Ekle"';
const addAddr = '<div class="field"><label>Adres (İsteğe Bağlı)</label><textarea id="emp-address" placeholder="Çalışanın adresi..."></textarea></div>';
const aStart = s.indexOf(addMarker);
const apos = s.indexOf(addAddr, aStart);
if (apos > 0 && !s.includes('emp-annual-leave-days" min="0" max="365" value="14"')) {
  const addBlock = `<div class="field">
      <label>Yıllık izin hakkı (gün)</label>
      <input type="number" id="emp-annual-leave-days" min="0" max="365" value="14"/>
      <div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.4;">Varsayılan hakediş günü.</div>
    </div>
    `;
  s = s.slice(0, apos) + addBlock + s.slice(apos);
  console.log("inserted add annual field");
}

const beforePush = '        if (DB.users.find(u => u.username === uname)) { showToast("Bu kullanıcı adı alınmış", "warn"); return false; }\n        const uid = "u" + genId();';
const afterPush = beforePush + '\n        const annualLeaveDays = parseInt(document.getElementById("emp-annual-leave-days")?.value, 10);\n        if (isNaN(annualLeaveDays) || annualLeaveDays < 0 || annualLeaveDays > 365) { showToast("Yıllık izin 0–365 gün arasında olmalı", "warn"); return false; }';
if (s.includes(beforePush) && !s.includes('emp-annual-leave-days")?.value, 10);\n        if (isNaN(annualLeaveDays)')) {
  s = s.replace(beforePush, afterPush);
}
const addPushOld = "phone, address, hiddenMenuIds: [] });";
const addPushNew = "phone, address, annualLeaveDays, hiddenMenuIds: [] });";
if (s.includes(addPushOld)) {
  s = s.replace(addPushOld, addPushNew);
  console.log("patched add push");
}

fs.writeFileSync(path, s);
console.log("done");
