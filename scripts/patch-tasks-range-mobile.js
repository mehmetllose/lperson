const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

// ── CSS ──
if (!h.includes("jobtasks-nav")) {
  h = h.replace(
    "    .tasks-onetime-row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }",
    `    .tasks-onetime-row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tasks-ot-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .jobtasks-nav { margin-bottom: 10px; }
    .jobtasks-date-title { text-align: center; flex: 1; min-width: 0; padding: 0 6px; }
    .jobtasks-date-title .jt-day { font-family: var(--font-display); font-size: 17px; font-weight: 800; color: var(--text); line-height: 1.2; }
    .jobtasks-date-title .jt-sub { font-size: 11px; color: var(--text3); margin-top: 2px; }
    .jobtasks-pick-btn { margin: 0 auto 10px; display: block; }
    .tasks-paper-sheet {
      background: linear-gradient(180deg, #f8f4e8 0%, #f3efe3 100%);
      border: 1px solid rgba(180, 160, 120, 0.45);
      border-radius: 8px;
      padding: 8px 10px 4px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }
    .tasks-paper-task-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 6px; margin: 0;
      border-bottom: 1px dashed rgba(120, 100, 70, 0.28);
      cursor: pointer; color: #2a2418;
      font-family: Georgia, "Times New Roman", serif;
    }
    .tasks-paper-task-item:last-child { border-bottom: none; }
    .tasks-paper-task-item input[type="checkbox"] { width: 17px; height: 17px; margin-top: 3px; accent-color: #6b5a3a; flex-shrink: 0; }
    .tasks-paper-task-text { font-size: 14px; line-height: 1.5; flex: 1; min-width: 0; }
    .tasks-paper-task-note { font-size: 11px; color: #6b5a3a; }
    @media (max-width: 520px) {
      .tasks-ot-dates { grid-template-columns: 1fr 1fr; }
      .jobtasks-date-title .jt-day { font-size: 15px; }
    }`
  );
}

// ── jobtasks view date + helpers ──
if (!h.includes("let jobtasksViewDateKey")) {
  h = h.replace(
    "    const TASK_WEEK_DAYS = [",
    `    let jobtasksViewDateKey = null;

    const TASK_WEEK_DAYS = [`
  );
}

const helpersOld = `    function getOneTimeTasksForCompany() {
      const items = [];
      getWorkers().forEach(w => {
        getDailyTaskKeys(w.id).forEach(dateKey => {
          const list = ensureJobTasks(w.id)[dateKey];
          if (!Array.isArray(list)) return;
          list.forEach(task => items.push({ worker: w, dateKey, task: normalizeJobTask(task, false) }));
        });
      });
      return items.sort((a, b) => (b.dateKey || "").localeCompare(a.dateKey || "") || String(a.worker.name).localeCompare(String(b.worker.name), "tr"));
    }
    function removeOneTimeTask(uid, dateKey, taskId) {
      const store = ensureJobTasks(uid);
      const arr = (Array.isArray(store[dateKey]) ? store[dateKey] : []).filter(t => String(t.id) !== String(taskId));
      if (arr.length) store[dateKey] = arr;
      else delete store[dateKey];
    }`;

const helpersNew = `    function eachDateKeyInRange(startYmd, endYmd, cb) {
      const a = parseYMDLocal(startYmd);
      const b = parseYMDLocal(endYmd);
      if (!a || !b) return false;
      let d = stripTimeLocal(a);
      const end = stripTimeLocal(b);
      if (d > end) return false;
      while (d <= end) {
        cb(fmtYMDLocal(d));
        d = new Date(d);
        d.setDate(d.getDate() + 1);
      }
      return true;
    }
    function formatTaskDateRange(startDate, endDate) {
      if (!startDate) return "—";
      if (!endDate || startDate === endDate) return startDate;
      return startDate + " → " + endDate;
    }
    function removeTaskCopies(uid, rangeId, taskId) {
      getDailyTaskKeys(uid).forEach(dk => {
        const store = ensureJobTasks(uid);
        const list = store[dk];
        if (!Array.isArray(list)) return;
        const next = list.filter(t => !(String(t.id) === String(taskId) && String(t.rangeId || t.id) === String(rangeId)));
        if (next.length) store[dk] = next;
        else delete store[dk];
      });
    }
    function getOneTimeTasksForCompany() {
      const seen = new Map();
      const items = [];
      getWorkers().forEach(w => {
        getDailyTaskKeys(w.id).forEach(dateKey => {
          const list = ensureJobTasks(w.id)[dateKey];
          if (!Array.isArray(list)) return;
          list.forEach(raw => {
            const task = normalizeJobTask(raw, false);
            const rangeId = task.rangeId || task.id;
            const key = w.id + "|" + rangeId + "|" + task.id;
            if (seen.has(key)) {
              const ex = seen.get(key);
              if (dateKey < ex.startDate) ex.startDate = dateKey;
              if (dateKey > ex.endDate) ex.endDate = dateKey;
              return;
            }
            const item = {
              worker: w,
              dateKey,
              startDate: task.rangeStart || dateKey,
              endDate: task.rangeEnd || dateKey,
              task,
              rangeId,
            };
            seen.set(key, item);
            items.push(item);
          });
        });
      });
      return items.sort((a, b) =>
        (b.startDate || "").localeCompare(a.startDate || "") ||
        String(a.worker.name).localeCompare(String(b.worker.name), "tr")
      );
    }
    function removeOneTimeTask(uid, dateKey, taskId) {
      const t = (ensureJobTasks(uid)[dateKey] || []).find(x => String(x.id) === String(taskId));
      if (t && t.rangeId) removeTaskCopies(uid, t.rangeId, taskId);
      else {
        const store = ensureJobTasks(uid);
        const arr = (Array.isArray(store[dateKey]) ? store[dateKey] : []).filter(x => String(x.id) !== String(taskId));
        if (arr.length) store[dateKey] = arr;
        else delete store[dateKey];
      }
    }`;

if (h.includes(helpersOld)) h = h.replace(helpersOld, helpersNew);
else console.warn("helpers block missing");

// normalizeJobTask add range fields
h = h.replace(
  `    function normalizeJobTask(t, needsDefault) {
      const na = t.needsApproval != null ? !!t.needsApproval : !!needsDefault;
      return {
        id: t.id || ("t" + genId()),
        text: String(t.text || ""),
        done: !!t.done,
        needsApproval: na,
        pendingApproval: !!t.pendingApproval,
        approved: !!t.approved,
      };
    }`,
  `    function normalizeJobTask(t, needsDefault) {
      const na = t.needsApproval != null ? !!t.needsApproval : !!needsDefault;
      return {
        id: t.id || ("t" + genId()),
        text: String(t.text || ""),
        done: !!t.done,
        needsApproval: na,
        pendingApproval: !!t.pendingApproval,
        approved: !!t.approved,
        rejected: !!t.rejected,
        rangeId: t.rangeId || null,
        rangeStart: t.rangeStart || null,
        rangeEnd: t.rangeEnd || null,
      };
    }`
);

// renderOneTimeTaskRow date range label
h = h.replace(
  `<motion.div style="font-size:11px;color:var(--text3);margin-top:4px;">\${escHtml(worker.name)} · \${escHtml(dateKey)} ·`,
  `<div style="font-size:11px;color:var(--text3);margin-top:4px;">\${escHtml(worker.name)} · \${escHtml(formatTaskDateRange(item.startDate, item.endDate))} ·`
);
h = h.split("motion.div").join("motion.div");
h = h.replace(
  "${escHtml(worker.name)} · ${escHtml(formatTaskDateRange(item.startDate, item.endDate))} ·",
  "${escHtml(worker.name)} · ${escHtml(formatTaskDateRange(item.startDate, item.endDate))} ·"
);
// fix if motion.div crept in renderOneTimeTaskRow - read and fix
h = h.replace(
  /function renderOneTimeTaskRow\(item\) \{[\s\S]*?return `<div class="tasks-onetime-row">[\s\S]*?<\/motion.div>`;/,
  (m) => m.replace(/motion\.motion\.div/g, "div").replace(/<\/?motion\.div>/g, (t) => t.replace("motion.", ""))
);

// Simpler fix renderOneTimeTaskRow line
h = h.replace(
  "${escHtml(worker.name)} · ${escHtml(dateKey)} ·",
  "${escHtml(worker.name)} · ${escHtml(formatTaskDateRange(item.startDate, item.endDate))} ·"
);

// Form: single date -> date range
h = h.replace(
  `<div class="field" style="margin:0;"><label>Tarih</label>
              <input type="date" id="tasks-ot-date" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>`,
  `<div class="tasks-ot-dates tasks-ot-span2" style="margin:0;">
              <div class="field" style="margin:0;"><label>Başlangıç</label>
                <input type="date" id="tasks-ot-date-start" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>
              <div class="field" style="margin:0;"><label>Bitiş</label>
                <input type="date" id="tasks-ot-date-end" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>
            </div>`
);

// patronAddOneTimeTask
const addOld = `    async function patronAddOneTimeTask() {
      if (currentUser?.role !== "patron") return;
      const wid = document.getElementById("tasks-ot-worker")?.value;
      const dateKey = (document.getElementById("tasks-ot-date")?.value || "").trim();
      const text = (document.getElementById("tasks-ot-text")?.value || "").trim();
      const needsApproval = !!document.getElementById("tasks-ot-na-switch")?.classList.contains("on");
      if (!wid) { showToast("Personel seçin", "warn"); return; }
      if (!parseYMDLocal(dateKey)) { showToast("Geçerli bir tarih seçin", "warn"); return; }
      if (!text) { showToast("Görev metni girin", "warn"); return; }
      const arr = Array.isArray(ensureJobTasks(wid)[dateKey]) ? [...ensureJobTasks(wid)[dateKey]] : [];
      arr.push(normalizeJobTask({ id: "t" + genId(), text, done: false, needsApproval, pendingApproval: false, approved: false, rejected: false }, needsApproval));
      setJobTasksForDay(wid, dateKey, arr);
      localCacheSave();
      await saveUserTasklists(wid);
      const ta = document.getElementById("tasks-ot-text");
      if (ta) ta.value = "";
      showToast("Tek seferlik görev eklendi ✓");
      renderTasksPatronPage();
    }`;

const addNew = `    async function patronAddOneTimeTask() {
      if (currentUser?.role !== "patron") return;
      const wid = document.getElementById("tasks-ot-worker")?.value;
      const startDate = (document.getElementById("tasks-ot-date-start")?.value || "").trim();
      const endDate = (document.getElementById("tasks-ot-date-end")?.value || startDate).trim();
      const text = (document.getElementById("tasks-ot-text")?.value || "").trim();
      const needsApproval = !!document.getElementById("tasks-ot-na-switch")?.classList.contains("on");
      if (!wid) { showToast("Personel seçin", "warn"); return; }
      if (!parseYMDLocal(startDate) || !parseYMDLocal(endDate)) { showToast("Geçerli tarih aralığı seçin", "warn"); return; }
      if (endDate < startDate) { showToast("Bitiş tarihi başlangıçtan önce olamaz", "warn"); return; }
      if (!text) { showToast("Görev metni girin", "warn"); return; }
      const taskId = "t" + genId();
      const rangeId = "r" + genId();
      const base = { id: taskId, rangeId, rangeStart: startDate, rangeEnd: endDate, text, done: false, needsApproval, pendingApproval: false, approved: false, rejected: false };
      eachDateKeyInRange(startDate, endDate, dk => {
        const arr = Array.isArray(ensureJobTasks(wid)[dk]) ? [...ensureJobTasks(wid)[dk]] : [];
        arr.push(normalizeJobTask({ ...base }, needsApproval));
        setJobTasksForDay(wid, dk, arr);
      });
      localCacheSave();
      await saveUserTasklists(wid);
      const ta = document.getElementById("tasks-ot-text");
      if (ta) ta.value = "";
      showToast("Tek seferlik görev eklendi ✓");
      renderTasksPatronPage();
    }`;

if (h.includes(addOld)) h = h.replace(addOld, addNew);

// patronEditOneTimeTask - add date range fields
const editOld = `    function patronEditOneTimeTask(encW, encD, encT) {
      if (currentUser?.role !== "patron") return;
      const wid = decodeURIComponent(encW || "");
      const dateKey = decodeURIComponent(encD || "");
      const taskId = decodeURIComponent(encT || "");
      const list = ensureJobTasks(wid)[dateKey];
      const t = Array.isArray(list) ? list.find(x => String(x.id) === String(taskId)) : null;
      if (!t) return;
      openModal("Görevi düzenle", \`
        <div class="field"><label>Görev</label><input type="text" id="edit-ot-text" value="\${escHtml(t.text || "")}"/></div>
        <motion.div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
          <div id="edit-ot-na" class="wsp-switch \${t.needsApproval ? "on" : ""}" onclick="this.classList.toggle('on')" style="cursor:pointer;"><div class="wsp-switch-knob"></div></div>
        </div>\`, async () => {
        const text = (document.getElementById("edit-ot-text")?.value || "").trim();
        const needsApproval = !!document.getElementById("edit-ot-na")?.classList.contains("on");
        if (!text) { showToast("Görev metni boş olamaz", "warn"); return false; }
        _updateTaskInStore(wid, dateKey, "daily", taskId, old => ({ ...old, text, needsApproval }));
        localCacheSave();
        await saveUserTasklists(wid);
        showToast("Görev güncellendi ✓");
        renderTasksPatronPage();
        return true;
      });
    }`;

const editNew = `    function patronEditOneTimeTask(encW, encD, encT) {
      if (currentUser?.role !== "patron") return;
      const wid = decodeURIComponent(encW || "");
      const dateKey = decodeURIComponent(encD || "");
      const taskId = decodeURIComponent(encT || "");
      const list = ensureJobTasks(wid)[dateKey];
      const t = Array.isArray(list) ? list.find(x => String(x.id) === String(taskId)) : null;
      if (!t) return;
      const rs = t.rangeStart || dateKey;
      const re = t.rangeEnd || dateKey;
      const rid = t.rangeId || t.id;
      openModal("Görevi düzenle", \`
        <div class="field"><label>Görev</label><input type="text" id="edit-ot-text" value="\${escHtml(t.text || "")}"/></div>
        <div class="tasks-ot-dates" style="margin-top:10px;">
          <motion.div class="field"><label>Başlangıç</label><input type="date" id="edit-ot-start" value="\${escHtml(rs)}"/></div>
          <div class="field"><label>Bitiş</label><input type="date" id="edit-ot-end" value="\${escHtml(re)}"/></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
          <div id="edit-ot-na" class="wsp-switch \${t.needsApproval ? "on" : ""}" onclick="this.classList.toggle('on')" style="cursor:pointer;"><div class="wsp-switch-knob"></div></motion.div>
        </div>\`, async () => {
        const text = (document.getElementById("edit-ot-text")?.value || "").trim();
        const startDate = (document.getElementById("edit-ot-start")?.value || "").trim();
        const endDate = (document.getElementById("edit-ot-end")?.value || startDate).trim();
        const needsApproval = !!document.getElementById("edit-ot-na")?.classList.contains("on");
        if (!text) { showToast("Görev metni boş olamaz", "warn"); return false; }
        if (!parseYMDLocal(startDate) || !parseYMDLocal(endDate)) { showToast("Geçerli tarih aralığı girin", "warn"); return false; }
        if (endDate < startDate) { showToast("Bitiş tarihi başlangıçtan önce olamaz", "warn"); return false; }
        removeTaskCopies(wid, rid, taskId);
        const base = { id: taskId, rangeId: rid, rangeStart: startDate, rangeEnd: endDate, text, needsApproval, done: !!t.done, pendingApproval: !!t.pendingApproval, approved: !!t.approved, rejected: !!t.rejected };
        eachDateKeyInRange(startDate, endDate, dk => {
          const arr = Array.isArray(ensureJobTasks(wid)[dk]) ? [...ensureJobTasks(wid)[dk]] : [];
          arr.push(normalizeJobTask({ ...base }, needsApproval));
          setJobTasksForDay(wid, dk, arr);
        });
        localCacheSave();
        await saveUserTasklists(wid);
        showToast("Görev güncellendi ✓");
        renderTasksPatronPage();
        return true;
      });
    }`;

if (h.includes('id="edit-ot-text"')) {
  if (h.includes("edit-ot-start")) console.log("edit already has range");
  else if (h.includes(editOld.split("motion.div").join("motion.div"))) {
    // skip
  } else {
    const editOldClean = editOld.replace(/motion\.div/g, "div");
    if (h.includes(editOldClean)) h = h.replace(editOldClean, editNew.replace(/motion\.motion\.motion\.div/g, "div").replace(/<\/?motion\.motion\.div>/g, ""));
  }
}

// Try replace edit without motion
const editOld2 = `      openModal("Görevi düzenle", \`
        <div class="field"><label>Görev</label><input type="text" id="edit-ot-text" value="\${escHtml(t.text || "")}"/></div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
          <motion.div id="edit-ot-na" class="wsp-switch \${t.needsApproval ? "on" : ""}" onclick="this.classList.toggle('on')" style="cursor:pointer;"><div class="wsp-switch-knob"></div></div>
        </div>\`, async () => {
        const text = (document.getElementById("edit-ot-text")?.value || "").trim();
        const needsApproval = !!document.getElementById("edit-ot-na")?.classList.contains("on");
        if (!text) { showToast("Görev metni boş olamaz", "warn"); return false; }
        _updateTaskInStore(wid, dateKey, "daily", taskId, old => ({ ...old, text, needsApproval }));`;

const editNew2 = `      openModal("Görevi düzenle", \`
        <motion.div class="field"><label>Görev</label><input type="text" id="edit-ot-text" value="\${escHtml(t.text || "")}"/></div>
        <div class="tasks-ot-dates" style="margin-top:10px;">
          <div class="field"><label>Başlangıç</label><input type="date" id="edit-ot-start" value="\${escHtml(rs)}"/></div>
          <div class="field"><label>Bitiş</label><input type="date" id="edit-ot-end" value="\${escHtml(re)}"/></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
          <div id="edit-ot-na" class="wsp-switch \${t.needsApproval ? "on" : ""}" onclick="this.classList.toggle('on')" style="cursor:pointer;"><div class="wsp-switch-knob"></div></div>
        </div>\`, async () => {
        const text = (document.getElementById("edit-ot-text")?.value || "").trim();
        const startDate = (document.getElementById("edit-ot-start")?.value || "").trim();
        const endDate = (document.getElementById("edit-ot-end")?.value || startDate).trim();
        const needsApproval = !!document.getElementById("edit-ot-na")?.classList.contains("on");
        if (!text) { showToast("Görev metni boş olamaz", "warn"); return false; }
        if (!parseYMDLocal(startDate) || !parseYMDLocal(endDate)) { showToast("Geçerli tarih aralığı girin", "warn"); return false; }
        if (endDate < startDate) { showToast("Bitiş tarihi başlangıçtan önce olamaz", "warn"); return false; }
        removeTaskCopies(wid, rid, taskId);
        const base = { id: taskId, rangeId: rid, rangeStart: startDate, rangeEnd: endDate, text, needsApproval, done: !!t.done, pendingApproval: !!t.pendingApproval, approved: !!t.approved, rejected: !!t.rejected };
        eachDateKeyInRange(startDate, endDate, dk => {
          const arr = Array.isArray(ensureJobTasks(wid)[dk]) ? [...ensureJobTasks(wid)[dk]] : [];
          arr.push(normalizeJobTask({ ...base }, needsApproval));
          setJobTasksForDay(wid, dk, arr);
        });`;

if (h.includes("_updateTaskInStore(wid, dateKey, \"daily\", taskId, old => ({ ...old, text, needsApproval }));")) {
  h = h.replace(editOld2.replace(/motion\.div/g, "motion.div"), editNew2.replace(/motion\.div/g, "motion.div"));
}

h = h.split("motion.div").join("div");

// Also fix patronEditOneTimeTask header - add rs,re,rid before openModal if missing
if (!h.includes("const rid = t.rangeId")) {
  h = h.replace(
    `      const t = Array.isArray(list) ? list.find(x => String(x.id) === String(taskId)) : null;
      if (!t) return;
      openModal("Görevi düzenle",`,
    `      const t = Array.isArray(list) ? list.find(x => String(x.id) === String(taskId)) : null;
      if (!t) return;
      const rs = t.rangeStart || dateKey;
      const re = t.rangeEnd || dateKey;
      const rid = t.rangeId || t.id;
      openModal("Görevi düzenle",`
  );
}

// renderJobTasksWorkerPage replacement
const workerRenderOld = `    function renderJobTasksWorkerPage() {
      const root = document.getElementById("jobtasks-worker-root");
      if (!root || currentUser?.role !== "calisan") return;
      const prevD = document.getElementById("jobtasks-cal-date")?.value;
      const dk = prevD || todayKey();
      const list = getJobTasksForDay(currentUser.id, dk);
      const headDate = \`<div class="field" style="margin-bottom:12px;">
        <label>Gün</label>
        <input type="date" id="jobtasks-cal-date" value="\${dk}" onchange="renderJobTasksWorkerPage()" style="max-width:220px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:9px 11px;"/></div>\`;
      if (!list.length) {
        root.innerHTML = \`<div class="card"><motion.div class="section-hd" style="margin-bottom:8px;">Görevlerim</div>\${headDate}<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">Bu gün için görev yok</motion.div></div></div>\`;
        return;
      }
      const rows = list.map(t => {
        const checked = !!(t.done || t.pendingApproval);
        const wait = !!(t.pendingApproval && !t.done);
        const note = wait ? " · onay bekliyor" : (t.done && t.approved ? " · onaylandı" : "");
        return \`<label style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:\${wait ? "default" : "pointer"};opacity:\${wait ? "0.85" : "1"};">
          <input type="checkbox" data-jtd="\${t.id}" \${checked ? "checked" : ""} \${wait ? "disabled" : ""} onchange="toggleWorkerJobTaskChk(this,'\${dk}')" style="width:18px;height:18px;margin-top:2px;accent-color:var(--accent);flex-shrink:0;"/>
          <span style="font-size:14px;color:var(--text);line-height:1.45;\${t.done ? "text-decoration:line-through;opacity:0.72;" : ""}">\${escHtml(t.text || "")}<span style="font-size:11px;color:var(--text3);">\${note}</span></span>
        </label>\`;
      }).join("");
      root.innerHTML = \`<div class="card"><div class="section-hd" style="margin-bottom:8px;">Görevlerim</div>\${headDate}\${rows}</div>\`;
    }`;

const workerRenderNew = `    function changeJobtasksDay(dir) {
      if (currentUser?.role !== "calisan") return;
      const inp = document.getElementById("jobtasks-cal-date");
      let d = parseYMDLocal(inp?.value || jobtasksViewDateKey || todayKey()) || stripTimeLocal(new Date());
      d.setDate(d.getDate() + dir);
      jobtasksViewDateKey = fmtYMDLocal(d);
      if (inp) inp.value = jobtasksViewDateKey;
      renderJobTasksWorkerPage();
    }
    function jobtasksPickDate(v) {
      if (!parseYMDLocal(v)) return;
      jobtasksViewDateKey = v;
      const inp = document.getElementById("jobtasks-cal-date");
      if (inp) inp.value = v;
      renderJobTasksWorkerPage();
    }
    function renderJobTasksWorkerPage() {
      const root = document.getElementById("jobtasks-worker-root");
      if (!root || currentUser?.role !== "calisan") return;
      const dk = jobtasksViewDateKey || document.getElementById("jobtasks-cal-date")?.value || todayKey();
      jobtasksViewDateKey = dk;
      const list = getJobTasksForDay(currentUser.id, dk);
      const JT_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
      const JT_DAYS = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
      const dObj = parseYMDLocal(dk) || stripTimeLocal(new Date());
      const dateTitle = \`<div class="jobtasks-date-title">
          <div class="jt-day">\${dObj.getDate()} \${JT_MONTHS[dObj.getMonth()]} \${dObj.getFullYear()}</div>
          <div class="jt-sub">\${JT_DAYS[dObj.getDay()]}</div>
        </div>\`;
      const nav = \`<div class="month-nav jobtasks-nav">
          <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeJobtasksDay(-1)" aria-label="Önceki gün">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          \${dateTitle}
          <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeJobtasksDay(1)" aria-label="Sonraki gün">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <input type="date" id="jobtasks-cal-date" value="\${dk}" onchange="jobtasksPickDate(this.value)" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;" tabindex="-1" aria-hidden="true"/>
        <button type="button" class="btn btn-secondary btn-sm jobtasks-pick-btn" onclick="(function(){const i=document.getElementById('jobtasks-cal-date');if(i.showPicker)i.showPicker();else i.click();})()">Tarih seç</button>\`;
      const rows = list.map(t => {
        const checked = !!(t.done || t.pendingApproval);
        const wait = !!(t.pendingApproval && !t.done);
        const note = wait ? "onay bekliyor" : (t.done && t.approved ? "onaylandı" : "");
        return \`<label class="tasks-paper-task-item" style="cursor:\${wait ? "default" : "pointer"};opacity:\${wait ? "0.88" : "1"};">
          <input type="checkbox" data-jtd="\${t.id}" \${checked ? "checked" : ""} \${wait ? "disabled" : ""} onchange="toggleWorkerJobTaskChk(this,'\${dk}')"/>
          <span class="tasks-paper-task-text" style="\${t.done ? "text-decoration:line-through;opacity:0.75;" : ""}">\${escHtml(t.text || "")}\${note ? '<span class="tasks-paper-task-note"> · ' + escHtml(note) + '</span>' : ""}</span>
        </label>\`;
      }).join("");
      const body = list.length
        ? \`<div class="tasks-paper-sheet">\${rows}</motion.div>\`
        : \`<div class="tasks-paper-sheet" style="text-align:center;padding:20px 12px;color:#6b5a3a;font-size:13px;">Bu gün için görev yok</div>\`;
      root.innerHTML = \`<div class="card tasks-week-card"><div class="section-hd" style="margin-bottom:8px;">Görevlerim</div>\${nav}\${body}</div>\`;
    }`;

const workerRenderOldClean = workerRenderOld.replace(/motion\.div/g, "div");
const workerRenderNewClean = workerRenderNew.replace(/motion\.div/g, "div").replace(/<\/?motion\.motion\.div>/g, (x) => x.replace("motion.", ""));

if (h.includes("function renderJobTasksWorkerPage()")) {
  const start = h.indexOf("    function renderJobTasksWorkerPage()");
  const end = h.indexOf("    async function toggleWorkerJobTaskChk", start);
  if (start >= 0 && end > start) {
    const before = h.slice(0, start);
    const after = h.slice(end);
    h = before + workerRenderNewClean + "\n\n" + after;
    if (!h.includes("function changeJobtasksDay")) {
      // inserted render only - need changeJobtasksDay before render
    }
  }
}

// window exports
if (!h.includes("window.changeJobtasksDay")) {
  h = h.replace(
    "    window.patronAddOneTimeTask = patronAddOneTimeTask;",
    `    window.changeJobtasksDay = changeJobtasksDay;
    window.jobtasksPickDate = jobtasksPickDate;
    window.patronAddOneTimeTask = patronAddOneTimeTask;`
  );
}

fs.writeFileSync(p, h.split("motion.div").join("div"));
console.log("patch done", {
  range: h.includes("tasks-ot-date-start"),
  jobtasksNav: h.includes("jobtasks-nav"),
  eachDate: h.includes("eachDateKeyInRange"),
  changeDay: h.includes("changeJobtasksDay"),
});
