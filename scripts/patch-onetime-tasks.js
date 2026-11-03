const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

const old = `      root.innerHTML = \`\${pendingBlock}
        <div class="card tasks-week-card">
          <div class="section-hd" style="margin-bottom:6px;">Haftalık görev planı</div>`;

const neu = `      const oneTime = getOneTimeTasksForCompany();
      const workerOpts = workers.map(w => \`<option value="\${escHtml(w.id)}">\${escHtml(w.name)}</option>\`).join("");
      const oneTimeList = oneTime.length
        ? oneTime.map(renderOneTimeTaskRow).join("")
        : '<motion.div style="font-size:12px;color:var(--text3);font-style:italic;padding:8px 0;">Henüz tek seferlik görev yok.</div>';
      const oneTimeBlock = \`<div class="card" style="margin-bottom:12px;">
          <div class="section-hd" style="margin-bottom:8px;">Tek seferlik görevler</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.45;">Belirli bir güne özel görev ekleyin. Silme, düzenleme ve görev başına onay anahtarı buradan yapılır.</div>
          <div class="tasks-onetime-form">
            <div class="field" style="margin:0;"><label>Personel</label>
              <select id="tasks-ot-worker" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;">\${workerOpts}</select></div>
            <div class="field" style="margin:0;"><label>Tarih</label>
              <input type="date" id="tasks-ot-date" value="\${todayKey()}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;"/></div>
            <div class="field tasks-ot-span2" style="margin:0;"><label>Görev</label>
              <input type="text" id="tasks-ot-text" placeholder="Örn. Depo sayımı yapılacak" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 11px;font-size:13px;"/></div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
              <div id="tasks-ot-na-switch" class="wsp-switch" onclick="this.classList.toggle('on')" style="cursor:pointer;" title="Tamamlanınca patron onayı"><div class="wsp-switch-knob"></div></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="patronAddOneTimeTask()">Görev ekle</button>
            </div>
          </div>
          <div id="tasks-onetime-list">\${oneTimeList}</div>
        </div>\`;
      root.innerHTML = \`\${pendingBlock}\${oneTimeBlock}
        <div class="card tasks-week-card">
          <div class="section-hd" style="margin-bottom:6px;">Haftalık görev planı</div>`;

if (!h.includes(old)) {
  console.error("render anchor missing");
  process.exit(1);
}
h = h.replace(old, neu);
h = h.split("motion.div").join("div");

const fns = `    async function patronAddOneTimeTask() {
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
    }
    async function patronDeleteOneTimeTask(encW, encD, encT) {
      if (currentUser?.role !== "patron") return;
      const wid = decodeURIComponent(encW || "");
      const dateKey = decodeURIComponent(encD || "");
      const taskId = decodeURIComponent(encT || "");
      if (!confirm("Bu görev silinsin mi?")) return;
      removeOneTimeTask(wid, dateKey, taskId);
      localCacheSave();
      await saveUserTasklists(wid);
      showToast("Görev silindi");
      renderTasksPatronPage();
    }
    function patronEditOneTimeTask(encW, encD, encT) {
      if (currentUser?.role !== "patron") return;
      const wid = decodeURIComponent(encW || "");
      const dateKey = decodeURIComponent(encD || "");
      const taskId = decodeURIComponent(encT || "");
      const list = ensureJobTasks(wid)[dateKey];
      const t = Array.isArray(list) ? list.find(x => String(x.id) === String(taskId)) : null;
      if (!t) return;
      openModal("Görevi düzenle", \`
        <div class="field"><label>Görev</label><input type="text" id="edit-ot-text" value="\${escHtml(t.text || "")}"/></div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
          <span style="font-size:12px;color:var(--text2);">Onay gerekli</span>
          <div id="edit-ot-na" class="wsp-switch \${t.needsApproval ? "on" : ""}" onclick="this.classList.toggle('on')" style="cursor:pointer;"><div class="wsp-switch-knob"></motion.div>
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
    }
    async function patronToggleOneTimeTaskApproval(encW, encD, encT, el) {
      if (currentUser?.role !== "patron" || !el) return;
      el.classList.toggle("on");
      const wid = decodeURIComponent(encW || "");
      const dateKey = decodeURIComponent(encD || "");
      const taskId = decodeURIComponent(encT || "");
      const needsApproval = el.classList.contains("on");
      _updateTaskInStore(wid, dateKey, "daily", taskId, t => ({ ...t, needsApproval }));
      localCacheSave();
      await saveUserTasklists(wid);
    }

    function renderJobTasksWorkerPage() {`;

if (!h.includes("async function patronAddOneTimeTask")) {
  if (!h.includes("function renderJobTasksWorkerPage()")) {
    console.error("insert point missing");
    process.exit(1);
  }
  h = h.replace("    function renderJobTasksWorkerPage() {", fns.split("motion.div").join("motion.div"));
  h = h.replace(
    '<div class="wsp-switch-knob"></motion.div>',
    '<div class="wsp-switch-knob"></div>'
  );
}

const workerOld = `    async function toggleWorkerJobTaskChk(el, dateKey) {
      if (currentUser?.role !== "calisan") return;
      const taskId = el && el.dataset ? el.dataset.jtd : "";
      const checked = !!(el && el.checked);
      const uid = currentUser.id;
      const wkey = taskWeekdayKeyFromDateKey(dateKey);
      const arr = getWeeklyTasks(uid, wkey).map(t => {
        if (String(t.id) !== String(taskId)) return t;
        if (t.needsApproval) {
          if (checked) return { ...t, done: false, pendingApproval: true, approved: false, rejected: false };
          return { ...t, done: false, pendingApproval: false, approved: false, rejected: false };
        }
        return { ...t, done: checked, pendingApproval: false, approved: checked, rejected: false };
      });
      setWeeklyTasks(uid, wkey, arr);
      localCacheSave();
      await saveUserTasklists(uid);
      renderJobTasksWorkerPage();
    }`;

const workerNew = `    async function toggleWorkerJobTaskChk(el, dateKey) {
      if (currentUser?.role !== "calisan") return;
      const taskId = el && el.dataset ? el.dataset.jtd : "";
      const checked = !!(el && el.checked);
      const uid = currentUser.id;
      const mapTask = t => {
        if (String(t.id) !== String(taskId)) return t;
        if (t.needsApproval) {
          if (checked) return { ...t, done: false, pendingApproval: true, approved: false, rejected: false };
          return { ...t, done: false, pendingApproval: false, approved: false, rejected: false };
        }
        return { ...t, done: checked, pendingApproval: false, approved: checked, rejected: false };
      };
      const daily = ensureJobTasks(uid)[dateKey];
      const inDaily = Array.isArray(daily) && daily.some(t => String(t.id) === String(taskId));
      if (inDaily) {
        setJobTasksForDay(uid, dateKey, daily.map(mapTask));
      } else {
        const wkey = taskWeekdayKeyFromDateKey(dateKey);
        setWeeklyTasks(uid, wkey, getWeeklyTasks(uid, wkey).map(mapTask));
      }
      localCacheSave();
      await saveUserTasklists(uid);
      renderJobTasksWorkerPage();
    }`;

if (h.includes(workerOld)) h = h.replace(workerOld, workerNew);

const wins = `    window.patronAddOneTimeTask = patronAddOneTimeTask;
    window.patronDeleteOneTimeTask = patronDeleteOneTimeTask;
    window.patronEditOneTimeTask = patronEditOneTimeTask;
    window.patronToggleOneTimeTaskApproval = patronToggleOneTimeTaskApproval;
    window.renderTasksPatronPage = renderTasksPatronPage;`;

if (!h.includes("window.patronAddOneTimeTask")) {
  h = h.replace("    window.renderTasksPatronPage = renderTasksPatronPage;", wins);
}

h = h.split("motion.div").join("div");

fs.writeFileSync(p, h);
console.log("done", {
  add: h.includes("patronAddOneTimeTask"),
  ot: h.includes("Tek seferlik görevler"),
  workerDaily: h.includes("inDaily"),
});
