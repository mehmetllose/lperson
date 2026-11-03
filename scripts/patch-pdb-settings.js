const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

const oldBlock = `    function openPatronDashSettings() {
      const cfg = loadPatronWidgets();
      const body = \`<motion.div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Kartları aç/kapat, <b>tam satır</b> veya yarım genişlik seç, <b>3 sütunlu</b> sıkı ızgara (mobil) kullan, sırayı oklarla veya ana ekranda <b>sürükleyip bırakarak</b> değiştir.</div>\` +
        \`<div style="padding:10px 0 14px;border-bottom:1px solid var(--border);margin-bottom:8px;">
          <label style="font-size:12px;color:var(--text2);display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" \${getPatronGridCols(cfg) === 3 ? "checked" : ""} onchange="patronWidgetSetGridCols(this.checked)"/>
            Ana ekranda <b>3 sütun</b> (dar kartlar, mobil için)
          </label>
        </div>\` +
        PATRON_WIDGET_DEFS.map(w => {
          const on = cfg.enabled[w.id] ?? false;
          return \`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
            <div style="flex:1;min-width:0;margin-right:8px;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">\${w.icon} \${w.label}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4;">\${w.desc}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',-1)">↑</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',1)">↓</button>
                <label style="font-size:11px;color:var(--text2);display:inline-flex;align-items:center;gap:5px;cursor:pointer;">
                  <input type="checkbox" \${getPatronWidgetSpan(cfg, w.id) === getPatronGridCols(cfg) ? "checked" : ""} onchange="patronWidgetSetSpan('\${w.id}',this.checked)"/> Tam satır
                </label>
              </div>
            </div>
            <span onclick="togglePatronWidget('\${w.id}',this)" data-on="\${on}" style="display:inline-block;width:42px;height:24px;border-radius:12px;border:1px solid \${on?"rgba(245,166,35,0.4)":"var(--border2)"};background:\${on?"rgba(245,166,35,0.2)":"var(--bg4)"};position:relative;cursor:pointer;transition:all .2s;flex-shrink:0;align-self:center;">
              <span style="position:absolute;top:3px;\${on?"right:3px":"left:3px"};width:16px;height:16px;border-radius:50%;background:\${on?"var(--accent)":"#555"};transition:all .2s;"></span>
            </span>
          </div>\`;
        }).join("");
      openModal("Ana Ekran Ayarları", body, () => { renderPatronDashboard(); return true; });
    }`;

const newBlock = `    function patronWidgetToggleGridCols(el) {
      const cfg = loadPatronWidgets();
      const next = getPatronGridCols(cfg) === 3 ? 2 : 3;
      cfg.gridCols = next;
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", next === 3);
      showToast(next === 3 ? "3 sütunlu ızgara" : "2 sütunlu ızgara");
      renderPatronDashboard();
    }
    function patronWidgetToggleSpan(wid, el) {
      const cfg = loadPatronWidgets();
      const gCols = getPatronGridCols(cfg);
      const currentlyFull = getPatronWidgetSpan(cfg, wid) >= gCols;
      if (!cfg.span) cfg.span = {};
      cfg.span[wid] = currentlyFull ? 1 : 2;
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", !currentlyFull);
      renderPatronDashboard();
    }
    function patronWidgetToggleEnabled(id, el) {
      const cfg = loadPatronWidgets();
      const on = !!(cfg.enabled[id]);
      cfg.enabled[id] = !on;
      if (!cfg.order) cfg.order = PATRON_WIDGET_DEFS.map(w => w.id);
      if (!on && !cfg.order.includes(id)) cfg.order.push(id);
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", !on);
      renderPatronDashboard();
    }
    function openPatronDashSettings() {
      const cfg = loadPatronWidgets();
      const gCols = getPatronGridCols(cfg);
      const body = \`<div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Kartları aç/kapat, <b>tam satır</b> veya yarım genişlik seç, <b>3 sütunlu</b> sıkı ızgara kullan, sırayı oklarla veya ana ekranda <b>sürükleyip bırakarak</b> değiştir.</div>\` +
        \`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0 14px;border-bottom:1px solid var(--border);margin-bottom:8px;">
          <span style="font-size:12px;color:var(--text2);">Ana ekranda <b>3 sütun</b></span>
          <motion.div class="wsp-switch pdb-switch-sm \${gCols === 3 ? "on" : ""}" onclick="patronWidgetToggleGridCols(this)" role="switch" title="3 sütunlu ızgara"><div class="wsp-switch-knob"></motion.div></div>
        </div>\` +
        PATRON_WIDGET_DEFS.map(w => {
          const on = cfg.enabled[w.id] ?? false;
          const fullRow = getPatronWidgetSpan(cfg, w.id) >= gCols;
          return \`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
            <div style="flex:1;min-width:0;margin-right:8px;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">\${w.icon} \${w.label}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4;">\${w.desc}</div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',-1)">↑</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',1)">↓</button>
                <span style="font-size:11px;color:var(--text2);">Tam satır</span>
                <div class="wsp-switch pdb-switch-sm \${fullRow ? "on" : ""}" onclick="patronWidgetToggleSpan('\${w.id}',this)" role="switch" title="Tam satır genişlik"><div class="wsp-switch-knob"></div></div>
              </div>
            </div>
            <div class="wsp-switch pdb-switch-sm \${on ? "on" : ""}" onclick="patronWidgetToggleEnabled('\${w.id}',this)" role="switch" title="Widget aç/kapat"><div class="wsp-switch-knob"></div></div>
          </div>\`;
        }).join("");
      openModal("Ana Ekran Ayarları", body, () => { renderPatronDashboard(); return true; });
    }`;

// fix accidental motion.div in newBlock
const newBlockClean = newBlock
  .replace(/<motion\.div class="wsp-switch/g, '<div class="wsp-switch')
  .replace(/<\/motion\.motion\.motion\.div><\/div>/g, '</motion.div></div>')
  .replace(/<\/motion\.div><\/div>/g, '</div></div>')
  .replace(/<motion\.div class="wsp-switch-knob"><\/motion\.div>/g, '<div class="wsp-switch-knob"></motion.div>')
  .replace(/<div class="wsp-switch-knob"><\/motion\.div>/g, '<div class="wsp-switch-knob"></div>');

const actualOld = `    function openPatronDashSettings() {
      const cfg = loadPatronWidgets();
      const body = \`<div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Kartları aç/kapat, <b>tam satır</b> veya yarım genişlik seç, <b>3 sütunlu</b> sıkı ızgara (mobil) kullan, sırayı oklarla veya ana ekranda <b>sürükleyip bırakarak</b> değiştir.</div>\` +
        \`<div style="padding:10px 0 14px;border-bottom:1px solid var(--border);margin-bottom:8px;">
          <label style="font-size:12px;color:var(--text2);display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" \${getPatronGridCols(cfg) === 3 ? "checked" : ""} onchange="patronWidgetSetGridCols(this.checked)"/>
            Ana ekranda <b>3 sütun</b> (dar kartlar, mobil için)
          </label>
        </div>\` +
        PATRON_WIDGET_DEFS.map(w => {
          const on = cfg.enabled[w.id] ?? false;
          return \`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
            <motion.div style="flex:1;min-width:0;margin-right:8px;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">\${w.icon} \${w.label}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4;">\${w.desc}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',-1)">↑</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',1)">↓</button>
                <label style="font-size:11px;color:var(--text2);display:inline-flex;align-items:center;gap:5px;cursor:pointer;">
                  <input type="checkbox" \${getPatronWidgetSpan(cfg, w.id) === getPatronGridCols(cfg) ? "checked" : ""} onchange="patronWidgetSetSpan('\${w.id}',this.checked)"/> Tam satır
                </label>
              </div>
            </div>
            <span onclick="togglePatronWidget('\${w.id}',this)" data-on="\${on}" style="display:inline-block;width:42px;height:24px;border-radius:12px;border:1px solid \${on?"rgba(245,166,35,0.4)":"var(--border2)"};background:\${on?"rgba(245,166,35,0.2)":"var(--bg4)"};position:relative;cursor:pointer;transition:all .2s;flex-shrink:0;align-self:center;">
              <span style="position:absolute;top:3px;\${on?"right:3px":"left:3px"};width:16px;height:16px;border-radius:50%;background:\${on?"var(--accent)":"#555"};transition:all .2s;"></span>
            </span>
          </div>\`;
        }).join("");
      openModal("Ana Ekran Ayarları", body, () => { renderPatronDashboard(); return true; });
    }`;

const cleanNew = `    function patronWidgetToggleGridCols(el) {
      const cfg = loadPatronWidgets();
      const next = getPatronGridCols(cfg) === 3 ? 2 : 3;
      cfg.gridCols = next;
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", next === 3);
      showToast(next === 3 ? "3 sütunlu ızgara" : "2 sütunlu ızgara");
      renderPatronDashboard();
    }
    function patronWidgetToggleSpan(wid, el) {
      const cfg = loadPatronWidgets();
      const gCols = getPatronGridCols(cfg);
      const currentlyFull = getPatronWidgetSpan(cfg, wid) >= gCols;
      if (!cfg.span) cfg.span = {};
      cfg.span[wid] = currentlyFull ? 1 : 2;
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", !currentlyFull);
      renderPatronDashboard();
    }
    function patronWidgetToggleEnabled(id, el) {
      const cfg = loadPatronWidgets();
      const on = !!(cfg.enabled[id]);
      cfg.enabled[id] = !on;
      if (!cfg.order) cfg.order = PATRON_WIDGET_DEFS.map(w => w.id);
      if (!on && !cfg.order.includes(id)) cfg.order.push(id);
      savePatronWidgets(cfg);
      if (el) el.classList.toggle("on", !on);
      renderPatronDashboard();
    }
    function openPatronDashSettings() {
      const cfg = loadPatronWidgets();
      const gCols = getPatronGridCols(cfg);
      const body = \`<motion.div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Kartları aç/kapat, <b>tam satır</b> veya yarım genişlik seç, <b>3 sütunlu</b> sıkı ızgara kullan, sırayı oklarla veya ana ekranda <b>sürükleyip bırakarak</b> değiştir.</div>\` +
        \`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0 14px;border-bottom:1px solid var(--border);margin-bottom:8px;">
          <span style="font-size:12px;color:var(--text2);">Ana ekranda <b>3 sütun</b></span>
          <div class="wsp-switch pdb-switch-sm \${gCols === 3 ? "on" : ""}" onclick="patronWidgetToggleGridCols(this)" role="switch" title="3 sütunlu ızgara"><div class="wsp-switch-knob"></div></div>
        </div>\` +
        PATRON_WIDGET_DEFS.map(w => {
          const on = cfg.enabled[w.id] ?? false;
          const fullRow = getPatronWidgetSpan(cfg, w.id) >= gCols;
          return \`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
            <div style="flex:1;min-width:0;margin-right:8px;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">\${w.icon} \${w.label}</div>
              <motion.div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4;">\${w.desc}</div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',-1)">↑</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;" onclick="patronWidgetReorder('\${w.id}',1)">↓</button>
                <span style="font-size:11px;color:var(--text2);">Tam satır</span>
                <div class="wsp-switch pdb-switch-sm \${fullRow ? "on" : ""}" onclick="patronWidgetToggleSpan('\${w.id}',this)" role="switch" title="Tam satır genişlik"><div class="wsp-switch-knob"></div></div>
              </div>
            </div>
            <div class="wsp-switch pdb-switch-sm \${on ? "on" : ""}" onclick="patronWidgetToggleEnabled('\${w.id}',this)" role="switch" title="Widget aç/kapat"><div class="wsp-switch-knob"></div></div>
          </div>\`;
        }).join("");
      openModal("Ana Ekran Ayarları", body, () => { renderPatronDashboard(); return true; });
    }`.replace(/<motion\.div/g, "<div").replace(/<\/motion\.motion\.div>/g, "</div>").replace(/<\/motion\.div>/g, "</div>");

if (!h.includes("function patronWidgetToggleGridCols")) {
  const start = h.indexOf("    function openPatronDashSettings()");
  const end = h.indexOf("    function togglePatronWidget(", start);
  if (start < 0 || end < 0) {
    console.error("markers not found", start, end);
    process.exit(1);
  }
  h = h.slice(0, start) + cleanNew + h.slice(end);
}

if (!h.includes("window.patronWidgetToggleGridCols")) {
  h = h.replace(
    "    window.paToggleAccessBlock = paToggleAccessBlock;",
    "    window.patronWidgetToggleGridCols = patronWidgetToggleGridCols;\n    window.patronWidgetToggleSpan = patronWidgetToggleSpan;\n    window.patronWidgetToggleEnabled = patronWidgetToggleEnabled;\n    window.paToggleAccessBlock = paToggleAccessBlock;"
  );
}

fs.writeFileSync(p, h);
console.log("ok", h.includes("patronWidgetToggleSpan"), h.includes("pdb-switch-sm"));
