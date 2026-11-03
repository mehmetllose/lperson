const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");
const from = `            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
              <div id="tasks-ot-na-switch" class="wsp-switch" onclick="this.classList.toggle('on')" style="cursor:pointer;" title="Tamamlanınca patron onayı"><div class="wsp-switch-knob"></div></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="patronAddOneTimeTask()">Görev ekle</button>
            </div>`;
const to = `            <div class="tasks-ot-actions">
              <div id="tasks-ot-na-switch" class="wsp-switch" onclick="this.classList.toggle('on')" style="cursor:pointer;" title="Onay"><div class="wsp-switch-knob"></div></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="patronAddOneTimeTask()">Ekle</button>
            </div>`;
if (!h.includes(from)) {
  console.error("block not found");
  process.exit(1);
}
h = h.replace(from, to);
fs.writeFileSync(p, h);
console.log("ok");
