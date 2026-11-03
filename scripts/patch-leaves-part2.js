const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

if (!h.includes("function renderPatronActiveLeavesList")) {
  const start = h.indexOf("    function renderLeavesPage()");
  const end = h.indexOf("    function openPatronAssignLeaveModal()");
  const block = `    function renderPatronActiveLeavesList() {
      const wrap = document.getElementById("leaves-patron-active-wrap");
      const el = document.getElementById("leaves-patron-active-list");
      if (!wrap || !el) return;
      const today = todayKey();
      const list = (getSettings().patronAssignedLeaves || [])
        .filter(l => (l.endDate || "") >= today)
        .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
      wrap.style.display = "";
      if (!list.length) {
        el.innerHTML = '<motion.div style="font-size:12px;color:var(--text3);font-style:italic;padding:8px 0;">Henüz aktif patron izni yok.</div>';
        return;
      }
      const workers = getWorkers();
      el.innerHTML = list.map(l => {
        const w = workers.find(x => x.id === l.userId);
        const lt = resolveLeaveTypeById(l.leaveTypeId || "annual");
        return \`<div class="req-card" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:9px;height:9px;border-radius:50%;background:\${lt?.color || "#888"};flex-shrink:0;"></div>
              <div>
                <div style="font-size:13px;font-weight:600;">\${escHtml(w?.name || "Personel")}</div>
                <motion.div style="font-size:11px;color:var(--text2);">\${escHtml(lt?.label || "İzin")} · \${escHtml(l.startDate || "")} → \${escHtml(l.endDate || "")}</div>
              </div>
            </div>
            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");
    }

    function renderLeavesPage() {
      const ph = document.getElementById("leaves-patron-hint");
      const ch = document.getElementById("leaves-calisan-hint");
      const btn = document.getElementById("leaves-new-btn");
      const el = document.getElementById("leaves-list");
      if (!el) return;
      const isPat = currentUser?.role === "patron";
      const isCal = currentUser?.role === "calisan";
      const patAssignBtn = document.getElementById("leaves-patron-assign-btn");
      if (ph) ph.style.display = isPat ? "" : "none";
      if (ch) ch.style.display = isCal ? "" : "none";
      if (btn) btn.style.display = isCal ? "" : "none";
      if (patAssignBtn) patAssignBtn.style.display = isPat ? "" : "none";
      if (isPat) renderPatronActiveLeavesList();
      else {
        const wrap = document.getElementById("leaves-patron-active-wrap");
        if (wrap) wrap.style.display = "none";
      }
      let list = [];
      if (isPat) {
        list = getRequests().filter(r => r.companyId === currentUser.companyId && r.type === "leave")
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      } else if (isCal) {
        list = getRequests().filter(r => r.userId === currentUser.id && r.type === "leave")
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      }
      if (!list.length) {
        el.innerHTML = \`<div class="empty"><div class="empty-icon">🏖</div><div class="empty-text">\${isCal ? "Henüz izin talebi göndermedin" : "Bekleyen izin talebi yok"}</div></div>\`;
        return;
      }
      el.innerHTML = list.map(r => renderRequestCard(r, isPat)).join("");
    }

`;
  h = h.slice(0, start) + block.replace(/<\/?motion\.motion\.div/g, "").replace(/<\/?motion\.motion\.div/g, "").replace(/<\/?motion\.div/g, (m) => m.replace("motion.", "")) + h.slice(end);
}

if (h.includes('openModal("Çalışana izin"')) {
  const s = h.indexOf("      const today = todayKey();\n      openModal(\"Çalışana izin\"");
  const e = h.indexOf("      });", s) + 9;
  const ins = `      const today = todayKey();
      const lts = (getSettings().leaveTypes && getSettings().leaveTypes.length) ? getSettings().leaveTypes : DEFAULT_LEAVE_TYPES;
      const ltOpts = lts.map(lt => \`<option value="\${escHtml(lt.id)}">\${escHtml(lt.label)}</option>\`).join("");
      openModal("İzin Ekle", \`
        <div class="alert alert-info" style="margin-bottom:14px;">Seçilen tarih aralığına personel için izin işlenir; vardiya planındaki ilgili günler izinli olur.</div>
        <div class="field"><label>Personel</label>
          <select id="patron-leave-worker" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px;">\${wopts}</select></div>
        <div class="field"><label>İzin türü</label>
          <select id="patron-leave-type" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px 12px;">\${ltOpts}</select></motion.div>
        <div class="two-col gap-10" style="margin-bottom:14px;">
          <div class="field"><label>Başlangıç</label><input type="date" id="patron-leave-start" value="\${today}"/></div>
          <div class="field"><label>Bitiş</label><input type="date" id="patron-leave-end" value="\${today}"/></div>
        </div>
        <div class="field"><label>Not (isteğe bağlı)</label><textarea id="patron-leave-note" placeholder="İzin notu…"></textarea></div>
      \`, () => {
        const userId = document.getElementById("patron-leave-worker")?.value;
        const leaveTypeId = document.getElementById("patron-leave-type")?.value || "annual";
        const startDate = document.getElementById("patron-leave-start")?.value;
        const endDate = document.getElementById("patron-leave-end")?.value;
        const note = document.getElementById("patron-leave-note")?.value?.trim() || "";
        if (!userId || !startDate || !endDate) { showToast("Personel ve tarihler zorunlu", "warn"); return false; }
        if (endDate < startDate) { showToast("Bitiş tarihi başlangıçtan önce olamaz", "warn"); return false; }
        applyApprovedLeaveRange(userId, leaveTypeId, startDate, endDate);
        const comp = getCompany();
        if (!comp.settings.patronAssignedLeaves) comp.settings.patronAssignedLeaves = [];
        comp.settings.patronAssignedLeaves.push({
          id: "pl" + genId(),
          userId,
          leaveTypeId,
          startDate,
          endDate,
          note,
          createdAt: new Date().toISOString(),
        });
        saveSettings();
        localCacheSave();
        const w = workers.find(x => x.id === userId);
        fsSetDoc("records", userId, { data_: DB.records[userId] || {} }, { merge: false }).catch(() => {});
        showToast((w?.name || "Personel") + " için izin kaydedildi ✓");
        if (currentPage === "leaves") renderLeavesPage();
        if (currentPage === "shifts") renderShiftPlanPage();
        return true;
      });`.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""));
  h = h.slice(0, s) + ins + h.slice(e);
}

h = h.replace(
  `            const lt = (getSettings().leaveTypes||[]).find(x=>x.id===rec.leaveType);`,
  `            const lt = resolveLeaveType(rec.leaveType, rec);`
);
h = h.replace(
  `          const lt = (settings.leaveTypes||[]).find(x=>x.id===rec.leaveType);`,
  `          const lt = resolveLeaveType(rec.leaveType, rec);`
);
h = h.replace(
  `        const lt = (getSettings().leaveTypes || []).find(x => x.id === (r.leaveTypeId || "annual"));`,
  `        const lt = resolveLeaveTypeById(r.leaveTypeId || "annual");`
);
h = h.replace(
  `      const lt = rec.leaveType ? getSettings().leaveTypes.find(x => x.id === rec.leaveType) : null;`,
  `      const lt = rec.leaveType ? resolveLeaveType(rec.leaveType, rec) : null;`
);
h = h.replace(
  `      const lt = panelDraft.leaveType ? settings.leaveTypes.find(x => x.id === panelDraft.leaveType) : null;`,
  `      const lt = panelDraft.leaveType ? resolveLeaveType(panelDraft.leaveType, panelDraft) : null;`
);

if (!h.includes("window.openEditLeaveTypeModal")) {
  h = h.replace(
    "window.openPatronAssignLeaveModal = openPatronAssignLeaveModal;",
    "window.openPatronAssignLeaveModal = openPatronAssignLeaveModal;\n    window.renderPatronActiveLeavesList = renderPatronActiveLeavesList;\n    window.openEditLeaveTypeModal = openEditLeaveTypeModal;"
  );
}

fs.writeFileSync(p, h);
console.log("ok", h.includes("patron-leave-type"), h.includes("renderPatronActiveLeavesList"));
