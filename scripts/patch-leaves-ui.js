const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

h = h.replace(
  '<button class="nav-item" onclick="navTo(\'leaves\');closeSidebar();" id="nav-leaves">\n            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  '<button class="nav-item" onclick="navTo(\'leaves\');closeSidebar();" id="nav-leaves">\n            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-4"/><path d="M12 18a6 6 0 0 0 6-6 6 6 0 0 0-12 0 6 6 0 0 0 6 6z"/><path d="M12 2v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>'
);

h = h.replace(
  '<button class="nav-item" onclick="navTo(\'costs\');closeSidebar();" id="nav-costs">\n              <span class="nav-cur-icon" aria-hidden="true">₺</span>',
  '<button class="nav-item" onclick="navTo(\'costs\');closeSidebar();" id="nav-costs">\n              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20"/><path d="M17 5v15"/><path d="M7 10v10"/></svg>'
);

h = h.replace(
  '<button type="button" class="btn btn-secondary btn-sm" id="leaves-add-type-btn" style="display:none;" onclick="openAddLeaveTypeModal()">+ İzin türü ekle</button>\n                <button type="button" class="btn btn-primary btn-sm" id="leaves-patron-assign-btn" style="display:none;" onclick="openPatronAssignLeaveModal()">+ Çalışana izin</button>',
  '<button type="button" class="btn btn-primary btn-sm" id="leaves-patron-assign-btn" style="display:none;" onclick="openPatronAssignLeaveModal()">+ İzin Ekle</button>'
);

if (!h.includes("leaves-patron-active-wrap")) {
  h = h.replace(
    '<div id="leaves-list"></div>',
    '<motion.div id="leaves-patron-active-wrap" style="display:none;margin-bottom:18px;">\n              <div class="section-hd" style="margin-bottom:10px;">Mevcut İzinler</div>\n              <div id="leaves-patron-active-list"></div>\n            </div>\n            <div id="leaves-list"></div>'
  );
  h = h.replace(/<motion\.div id="leaves-patron-active-wrap"/, '<div id="leaves-patron-active-wrap"');
}

const helpers = `
    function leaveMetaSnapshot(leaveTypeId) {
      const lt = (getSettings().leaveTypes || []).find(x => x.id === leaveTypeId)
        || DEFAULT_LEAVE_TYPES.find(x => x.id === leaveTypeId)
        || ((getSettings().retiredLeaveTypes || {})[leaveTypeId]);
      if (!lt) return { label: leaveTypeId || "İzin", color: "#888888" };
      return { label: lt.label, color: lt.color || "#888888" };
    }
    function resolveLeaveType(leaveTypeId, record) {
      if (!leaveTypeId) return null;
      if (record && record.leaveMeta && record.leaveMeta.label) {
        return { id: leaveTypeId, label: record.leaveMeta.label, color: record.leaveMeta.color || "#888888" };
      }
      const active = (getSettings().leaveTypes || []).find(x => x.id === leaveTypeId);
      if (active) return active;
      const retired = (getSettings().retiredLeaveTypes || {})[leaveTypeId];
      if (retired) return { id: leaveTypeId, label: retired.label, color: retired.color || "#888888" };
      const def = DEFAULT_LEAVE_TYPES.find(x => x.id === leaveTypeId);
      if (def) return def;
      return { id: leaveTypeId, label: leaveTypeId, color: "#888888" };
    }
    function resolveLeaveTypeById(leaveTypeId) {
      return resolveLeaveType(leaveTypeId, null);
    }
    function freezeLeaveTypeOnRecords(leaveTypeId, oldLt) {
      if (!leaveTypeId || !oldLt) return;
      const meta = { label: oldLt.label, color: oldLt.color || "#888888" };
      const cid = currentUser?.companyId;
      if (!cid) return;
      DB.users.filter(u => u.companyId === cid).forEach(u => {
        const recs = DB.records[u.id];
        if (!recs) return;
        let touched = false;
        Object.keys(recs).forEach(dk => {
          const rec = normalizeRec(recs[dk]);
          if (rec.leaveType === leaveTypeId && !rec.leaveMeta) {
            recs[dk] = { ...rec, leaveMeta: meta };
            touched = true;
          }
        });
        if (touched) saveUserRecords(u.id);
      });
    }
    function getSelectedPresetColor(presetsSelector, fallback) {
      const root = document.querySelector(presetsSelector);
      if (!root) return fallback;
      if (root.dataset.selectedColor) return root.dataset.selectedColor;
      const dot = root.querySelector(".color-dot.selected");
      if (dot && dot.dataset.color) return dot.dataset.color;
      const picker = root.querySelector('input[type="color"]');
      return (picker && picker.value) ? picker.value : fallback;
    }
`;

if (!h.includes("function leaveMetaSnapshot")) {
  h = h.replace("    const DEFAULT_LEAVE_TYPES = [", helpers + "\n    const DEFAULT_LEAVE_TYPES = [");
}

if (!h.includes("retiredLeaveTypes")) {
  h = h.replace(
    "if (!merged.settings.shiftTemplates) merged.settings.shiftTemplates = [];",
    "if (!merged.settings.retiredLeaveTypes) merged.settings.retiredLeaveTypes = {};\n      if (!merged.settings.patronAssignedLeaves) merged.settings.patronAssignedLeaves = [];\n      if (!merged.settings.shiftTemplates) merged.settings.shiftTemplates = [];"
  );
}

if (h.includes('document.querySelectorAll(".color-dot")')) {
  h = h.replace(
    `    function selectEmpColor(el, color) {
      document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
      if (el.classList && el.classList.contains("color-dot")) el.classList.add("selected");
      el.dataset && (el.dataset.color = color);
    }`,
    `    function selectEmpColor(el, color) {
      const root = el && el.closest ? el.closest(".color-presets") : null;
      if (!root) return;
      const c = String(color || "").trim();
      if (!c) return;
      root.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
      if (el.classList && el.classList.contains("color-dot")) el.classList.add("selected");
      const picker = root.querySelector('input[type="color"]');
      if (picker) picker.value = c;
      root.dataset.selectedColor = c;
    }`
  );
}

if (!h.includes("leaveMeta = leaveMetaSnapshot")) {
  h = h.replace(
    `      for (const dk of dates) {
        const rec = normalizeRec(DB.records[userId][dk]);
        DB.records[userId][dk] = { ...rec, leaveType: ltId };
      }`,
    `      const leaveMeta = leaveMetaSnapshot(ltId);
      for (const dk of dates) {
        const rec = normalizeRec(DB.records[userId][dk]);
        DB.records[userId][dk] = { ...rec, leaveType: ltId, leaveMeta };
      }`
  );
}

h = h.replace(
  `      DB.records[workerId][dateKey] = { ...rec, leaveType: ltId };`,
  `      DB.records[workerId][dateKey] = { ...rec, leaveType: ltId, leaveMeta: leaveMetaSnapshot(ltId) };`
);

if (h.includes('document.querySelector(".color-dot.selected")')) {
  h = h.replace(
    `        const selDot = document.querySelector(".color-dot.selected");
        const color = selDot ? selDot.dataset.color : "#5b9cf6";`,
    `        const color = getSelectedPresetColor("#emp-color-presets", "#5b9cf6");`
  );
}
h = h.replace(
  `        const selDot = document.querySelector("#emp-color-presets .color-dot.selected");
        const color = selDot ? selDot.dataset.color : (w.color || "#5b9cf6");`,
  `        const color = getSelectedPresetColor("#emp-color-presets", w.color || "#5b9cf6");`
);
h = h.replace(
  `        const selDot = document.querySelector("#lt-color-presets .color-dot.selected");
        const color = selDot ? selDot.dataset.color : "#5b9cf6";`,
  `        const color = getSelectedPresetColor("#lt-color-presets", "#5b9cf6");`
);
h = h.replace(
  `      const selDot = document.querySelector("#tpl-color-presets .color-dot.selected");
      const color = selDot ? selDot.dataset.color : "#f5a623";`,
  `      const color = getSelectedPresetColor("#tpl-color-presets", "#f5a623");`
);
h = h.replace(
  `        const selDot = document.querySelector("#wp-color-presets .color-dot.selected");
        const color = selDot ? selDot.dataset.color : "#f5a623";`,
  `        const color = getSelectedPresetColor("#wp-color-presets", "#f5a623");`
);

if (!h.includes("function openEditLeaveTypeModal")) {
  const start = h.indexOf("    function renderLeaveTypeList()");
  const end = h.indexOf("    function openAddLeaveTypeModal()");
  const newCrud = `    function renderLeaveTypeList() {
      const lts = getSettings().leaveTypes || [];
      const el = document.getElementById("leave-type-list");
      if (!el) return;
      el.innerHTML = lts.length ? lts.map(lt => \`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:9px;">
        <div style="width:10px;height:10px;border-radius:50%;background:\${lt.color};"></div>
        <span style="font-size:13px;">\${escHtml(lt.label)}</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="openEditLeaveTypeModal('\${lt.id}')">Düzenle</button>
        <button class="btn btn-danger btn-sm" onclick="deleteLeaveType('\${lt.id}')">Sil</button>
      </div>
    </div>\`).join("") : '<div style="font-size:12px;color:var(--text3);font-style:italic;">Henüz izin türü yok.</div>';
    }
    function deleteLeaveType(id) {
      if (!confirm("Bu izin türü listeden kaldırılır. Takvimde işaretli eski günler silinmez veya değişmez.")) return;
      const comp = getCompany();
      const lt = (comp.settings.leaveTypes || []).find(x => x.id === id);
      if (lt) {
        if (!comp.settings.retiredLeaveTypes) comp.settings.retiredLeaveTypes = {};
        comp.settings.retiredLeaveTypes[id] = { label: lt.label, color: lt.color };
      }
      comp.settings.leaveTypes = (comp.settings.leaveTypes || []).filter(x => x.id !== id);
      saveSettings(); renderLeaveTypeList();
      try { if (typeof renderLeavesPage === "function" && currentPage === "leaves") renderLeavesPage(); } catch (e) {}
    }
    function openEditLeaveTypeModal(id) {
      const comp = getCompany();
      const lt = (comp.settings.leaveTypes || []).find(x => x.id === id);
      if (!lt) return;
      const oldSnap = { label: lt.label, color: lt.color };
      openModal("İzin Türü Düzenle", \`
    <motion.div class="field"><label>Adı</label><input type="text" id="lt-label" value="\${escHtml(lt.label)}"/></div>
    <div class="field">
      <label>Renk</label>
      <div class="color-presets" id="lt-color-presets" data-selected-color="\${lt.color || '#5b9cf6'}">
        \${["#5b9cf6", "#a78bfa", "#34d399", "#f472b6", "#fb923c", "#f87171", "#fbbf24", "#4ade80", "#22d3ee"].map((c) =>
          \`<div class="color-dot\${(lt.color||'#5b9cf6')===c?' selected':''}" style="background:\${c};" data-color="\${c}" onclick="selectEmpColor(this,'\${c}')"></div>\`
        ).join("")}
        <input type="color" value="\${lt.color||'#5b9cf6'}" oninput="selectEmpColor(this,this.value)"/>
      </div>
    </div>
  \`, () => {
        const label = document.getElementById("lt-label").value.trim();
        const color = getSelectedPresetColor("#lt-color-presets", lt.color || "#5b9cf6");
        if (!label) { showToast("İzin türü adı gerekli", "warn"); return false; }
        if (label !== oldSnap.label || color !== oldSnap.color) freezeLeaveTypeOnRecords(id, oldSnap);
        const ix = comp.settings.leaveTypes.findIndex(x => x.id === id);
        if (ix >= 0) comp.settings.leaveTypes[ix] = { ...lt, label, color };
        saveSettings(); renderLeaveTypeList();
        try { if (typeof renderLeavesPage === "function" && currentPage === "leaves") renderLeavesPage(); } catch (e) {}
        showToast("İzin türü güncellendi ✓");
        return true;
      });
    }
`;
  h = h.slice(0, start) + newCrud.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", "")) + h.slice(end);
}

fs.writeFileSync(p, h);
console.log("ok");
