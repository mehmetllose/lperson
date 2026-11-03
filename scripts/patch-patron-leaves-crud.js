const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

const helpers = `
    function getDateKeysInRange(startKey, endKey) {
      const a = parseKey(String(startKey || ""));
      const b = parseKey(String(endKey || ""));
      let d0 = new Date(a.year, a.month, a.day);
      const d1 = new Date(b.year, b.month, b.day);
      if (isNaN(d0.getTime()) || isNaN(d1.getTime()) || d1 < d0) return [];
      const dates = [];
      for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
        dates.push(keyFromDate(new Date(d)));
      }
      return dates;
    }

    function recordDayHasLeave(userId, dateKey) {
      return !!normalizeRec(DB.records[userId]?.[dateKey]).leaveType;
    }

    function splitContiguousDateKeys(sortedKeys) {
      if (!sortedKeys.length) return [];
      const ranges = [];
      let start = sortedKeys[0];
      let prev = sortedKeys[0];
      for (let i = 1; i < sortedKeys.length; i++) {
        const k = sortedKeys[i];
        const p = parseKey(prev);
        const n = new Date(p.year, p.month, p.day);
        n.setDate(n.getDate() + 1);
        if (k !== keyFromDate(n)) {
          ranges.push([start, prev]);
          start = k;
        }
        prev = k;
      }
      ranges.push([start, prev]);
      return ranges;
    }

    /** Patron izin kaydı ile takvim günlerini eşitle (Ay görünümünden silince listeden düşer). */
    function reconcilePatronAssignedLeaves(userId, touchedDateKey) {
      const comp = getCompany();
      if (!comp?.settings) return;
      const list = comp.settings.patronAssignedLeaves || [];
      if (!list.length) return;
      const next = [];
      for (const pl of list) {
        if (pl.userId !== userId) { next.push(pl); continue; }
        if (touchedDateKey && (touchedDateKey < pl.startDate || touchedDateKey > pl.endDate)) {
          next.push(pl);
          continue;
        }
        const dates = getDateKeysInRange(pl.startDate, pl.endDate);
        const withLeave = dates.filter(dk => recordDayHasLeave(userId, dk));
        if (!withLeave.length) continue;
        const ranges = splitContiguousDateKeys(withLeave);
        ranges.forEach(([s, e], idx) => {
          next.push({ ...pl, id: idx === 0 ? pl.id : ("pl" + genId()), startDate: s, endDate: e });
        });
      }
      comp.settings.patronAssignedLeaves = next;
      saveSettings();
      if (currentPage === "leaves") renderLeavesPage();
    }

    function clearLeaveRange(userId, startKey, endKey) {
      if (!DB.records[userId]) DB.records[userId] = {};
      for (const dk of getDateKeysInRange(startKey, endKey)) {
        if (!DB.records[userId][dk]) continue;
        const rec = normalizeRec(DB.records[userId][dk]);
        const cleared = { ...rec, leaveType: null, leaveMeta: null };
        const hasShiftData = cleared.shifts.some(s => s.start || s.end);
        const hasNote = !!(cleared.note && String(cleared.note).trim());
        if (hasShiftData || hasNote) DB.records[userId][dk] = cleared;
        else delete DB.records[userId][dk];
      }
      localCacheSave();
      saveUserRecords(userId);
    }

    function deletePatronAssignedLeave(leaveId) {
      if (currentUser?.role !== "patron") return;
      const comp = getCompany();
      const list = comp.settings.patronAssignedLeaves || [];
      const pl = list.find(x => x.id === leaveId);
      if (!pl) return;
      if (!confirm("Bu izin kaydı silinsin mi? İlgili günlerdeki izin işaretleri de kaldırılır.")) return;
      clearLeaveRange(pl.userId, pl.startDate, pl.endDate);
      comp.settings.patronAssignedLeaves = list.filter(x => x.id !== leaveId);
      saveSettings();
      localCacheSave();
      showToast("İzin kaydı silindi ✓");
      if (currentPage === "leaves") renderLeavesPage();
      else if (currentPage === "month") renderMonthPage();
      else if (currentPage === "shifts") renderShiftPlanPage();
    }

    function openEditPatronAssignedLeaveModal(leaveId) {
      if (currentUser?.role !== "patron") return;
      const comp = getCompany();
      const pl = (comp.settings.patronAssignedLeaves || []).find(x => x.id === leaveId);
      if (!pl) return;
      const workers = getWorkers();
      const wopts = workers.map(w => \`<option value="\${w.id}" \${w.id === pl.userId ? "selected" : ""}>\${escHtml(w.name)}</option>\`).join("");
      const lts = (getSettings().leaveTypes && getSettings().leaveTypes.length) ? getSettings().leaveTypes : DEFAULT_LEAVE_TYPES;
      const ltOpts = lts.map(lt => \`<option value="\${escHtml(lt.id)}" \${lt.id === (pl.leaveTypeId || "annual") ? "selected" : ""}>\${escHtml(lt.label)}</option>\`).join("");
      openModal("İzni Düzenle", \`
        <motion.div class="alert alert-info" style="margin-bottom:14px;">Tarih veya tür değişince takvimdeki izin işaretleri güncellenir.</div>
        <div class="field"><label>Personel</label>
          <select id="patron-leave-worker" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px;">\${wopts}</select></div>
        <div class="field"><label>İzin türü</label>
          <select id="patron-leave-type" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);padding:10px 12px;">\${ltOpts}</select></motion.div>
        <div class="two-col gap-10" style="margin-bottom:14px;">
          <div class="field"><label>Başlangıç</label><input type="date" id="patron-leave-start" value="\${pl.startDate || ""}"/></div>
          <div class="field"><label>Bitiş</label><input type="date" id="patron-leave-end" value="\${pl.endDate || ""}"/></div>
        </div>
        <div class="field"><label>Not (isteğe bağlı)</label><textarea id="patron-leave-note" placeholder="İzin notu…">\${escHtml(pl.note || "")}</textarea></div>
      \`.replace(/<\/?motion\.motion\.div/g, "").replace(/<\/?motion\.motion\.motion\.motion\.div/g, "").replace(/<\/?motion\.div/g, (m) => m.replace("motion.", "")), () => {
        const userId = document.getElementById("patron-leave-worker")?.value;
        const leaveTypeId = document.getElementById("patron-leave-type")?.value || "annual";
        const startDate = document.getElementById("patron-leave-start")?.value;
        const endDate = document.getElementById("patron-leave-end")?.value;
        const note = document.getElementById("patron-leave-note")?.value?.trim() || "";
        if (!userId || !startDate || !endDate) { showToast("Personel ve tarihler zorunlu", "warn"); return false; }
        if (endDate < startDate) { showToast("Bitiş tarihi başlangıçtan önce olamaz", "warn"); return false; }
        clearLeaveRange(pl.userId, pl.startDate, pl.endDate);
        comp.settings.patronAssignedLeaves = (comp.settings.patronAssignedLeaves || []).filter(x => x.id !== leaveId);
        applyApprovedLeaveRange(userId, leaveTypeId, startDate, endDate);
        comp.settings.patronAssignedLeaves.push({
          id: leaveId,
          userId,
          leaveTypeId,
          startDate,
          endDate,
          note,
          createdAt: pl.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        saveSettings();
        localCacheSave();
        fsSetDoc("records", userId, { data_: DB.records[userId] || {} }, { merge: false }).catch(() => {});
        showToast("İzin güncellendi ✓");
        if (currentPage === "leaves") renderLeavesPage();
        else if (currentPage === "month") renderMonthPage();
        else if (currentPage === "shifts") renderShiftPlanPage();
        return true;
      });
    }
`;

if (!h.includes("function getDateKeysInRange")) {
  h = h.replace(
    "      saveUserRecords(userId);\n    }\n\n    function renderTodayPage()",
    "      saveUserRecords(userId);\n    }\n" + helpers + "\n    function renderTodayPage()"
  );
}

// clearShiftCell sync
if (!h.includes("reconcilePatronAssignedLeaves(workerId")) {
  h = h.replace(
    `        localCacheSave();
        saveUserRecords(workerId);
      }
      showToast("Temizlendi");
      renderShiftPlanPage();
    }

    /** Patron izin talebini onayladığında`,
    `        localCacheSave();
        saveUserRecords(workerId);
        reconcilePatronAssignedLeaves(workerId, dateKey);
      }
      showToast("Temizlendi");
      renderShiftPlanPage();
      if (currentPage === "leaves") renderLeavesPage();
    }

    /** Patron izin talebini onayladığında`
  );
}

// savePanelDay sync
h = h.replace(
  `      const panelRec = { shifts: clean, note: panelDraft.note, leaveType: panelDraft.leaveType };
      if (panelDraft.leaveType) panelRec.leaveMeta = leaveMetaSnapshot(panelDraft.leaveType);
      DB.records[panelUserId][panelDayKey] = panelRec;
      localCacheSave();
      closePanel();
      if (currentPage === "today") renderTodayPage();
      else if (currentPage === "month") renderMonthPage();
      showToast("Kaydedildi ✓");
      saveUserRecords(panelUserId); // async, non-blocking`,
  `      const panelRec = { shifts: clean, note: panelDraft.note, leaveType: panelDraft.leaveType || null };
      if (panelDraft.leaveType) panelRec.leaveMeta = leaveMetaSnapshot(panelDraft.leaveType);
      else panelRec.leaveMeta = null;
      DB.records[panelUserId][panelDayKey] = panelRec;
      localCacheSave();
      if (!panelDraft.leaveType) reconcilePatronAssignedLeaves(panelUserId, panelDayKey);
      closePanel();
      if (currentPage === "today") renderTodayPage();
      else if (currentPage === "month") renderMonthPage();
      else if (currentPage === "leaves") renderLeavesPage();
      showToast("Kaydedildi ✓");
      saveUserRecords(panelUserId); // async, non-blocking`
);

// renderPatronActiveLeavesList with buttons
const oldRender = `      el.innerHTML = list.map(l => {
        const w = workers.find(x => x.id === l.userId);
        const lt = resolveLeaveTypeById(l.leaveTypeId || "annual");
        return \`<motion.div class="req-card" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:9px;height:9px;border-radius:50%;background:\${lt?.color || "#888"};flex-shrink:0;"></div>
              <div>
                <div style="font-size:13px;font-weight:600;">\${escHtml(w?.name || "Personel")}</div>
                <div style="font-size:11px;color:var(--text2);">\${escHtml(lt?.label || "İzin")} · \${escHtml(l.startDate || "")} → \${escHtml(l.endDate || "")}</div>
              </div>
            </div>
            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`;

const newRender = `      el.innerHTML = list.map(l => {
        const w = workers.find(x => x.id === l.userId);
        const lt = resolveLeaveTypeById(l.leaveTypeId || "annual");
        const active = (l.endDate || "") >= today;
        return \`<div class="req-card" style="margin-bottom:8px;">
          <motion.div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <div style="width:9px;height:9px;border-radius:50%;background:\${lt?.color || "#888"};flex-shrink:0;"></div>
              <div>
                <div style="font-size:13px;font-weight:600;">\${escHtml(w?.name || "Personel")}</div>
                <div style="font-size:11px;color:var(--text2);">\${escHtml(lt?.label || "İzin")} · \${escHtml(l.startDate || "")} → \${escHtml(l.endDate || "")}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span style="font-size:10px;color:\${active ? "var(--green)" : "var(--text3)"};font-weight:700;">\${active ? "Aktif" : "Geçmiş"}</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openEditPatronAssignedLeaveModal('\${l.id}')">Düzenle</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deletePatronAssignedLeave('\${l.id}')">Sil</button>
            </div>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`;

if (h.includes('onclick="openEditPatronAssignedLeaveModal')) {
  console.log("render already patched");
} else {
  const realOld = `      el.innerHTML = list.map(l => {
        const w = workers.find(x => x.id === l.userId);
        const lt = resolveLeaveTypeById(l.leaveTypeId || "annual");
        return \`<div class="req-card" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <motion.div style="width:9px;height:9px;border-radius:50%;background:\${lt?.color || "#888"};flex-shrink:0;"></div>
              <div>
                <div style="font-size:13px;font-weight:600;">\${escHtml(w?.name || "Personel")}</div>
                <div style="font-size:11px;color:var(--text2);">\${escHtml(lt?.label || "İzin")} · \${escHtml(l.startDate || "")} → \${escHtml(l.endDate || "")}</div>
              </div>
            </div>
            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </motion.div>\`;
      }).join("");`;
  // use actual file content
  const marker = `            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<motion.div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`;
  if (h.includes(marker)) {
    h = h.replace(marker, `            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span style="font-size:10px;color:\${(l.endDate || "") >= today ? "var(--green)" : "var(--text3)"};font-weight:700;">\${(l.endDate || "") >= today ? "Aktif" : "Geçmiş"}</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openEditPatronAssignedLeaveModal('\${l.id}')">Düzenle</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deletePatronAssignedLeave('\${l.id}')">Sil</button>
            </div>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`);
  } else {
    const marker2 = `            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<motion.div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`;
    const marker3 = `            <span style="font-size:10px;color:var(--green);font-weight:700;">Aktif</span>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`;
    if (h.includes(marker3)) {
      h = h.replace(marker3, `            <motion.div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span style="font-size:10px;color:\${(l.endDate || "") >= today ? "var(--green)" : "var(--text3)"};font-weight:700;">\${(l.endDate || "") >= today ? "Aktif" : "Geçmiş"}</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openEditPatronAssignedLeaveModal('\${l.id}')">Düzenle</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deletePatronAssignedLeave('\${l.id}')">Sil</button>
            </div>
          </div>
          \${l.note ? \`<div style="font-size:11px;color:var(--text3);margin-top:6px;">\${escHtml(l.note)}</div>\` : ""}
        </div>\`;
      }).join("");`.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", "")));
    }
  }
}

// Show all patron leaves (not only future end) so edit/delete works; still sort
h = h.replace(
  `      const list = (getSettings().patronAssignedLeaves || [])
        .filter(l => (l.endDate || "") >= today)
        .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));`,
  `      const list = (getSettings().patronAssignedLeaves || [])
        .slice()
        .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));`
);

if (!h.includes("window.deletePatronAssignedLeave")) {
  h = h.replace(
    "window.openEditLeaveTypeModal = openEditLeaveTypeModal;",
    "window.openEditLeaveTypeModal = openEditLeaveTypeModal;\n    window.deletePatronAssignedLeave = deletePatronAssignedLeave;\n    window.openEditPatronAssignedLeaveModal = openEditPatronAssignedLeaveModal;"
  );
}

fs.writeFileSync(p, h);
console.log("ok", {
  helpers: h.includes("getDateKeysInRange"),
  edit: h.includes("openEditPatronAssignedLeaveModal"),
  reconcile: h.includes("reconcilePatronAssignedLeaves"),
});
