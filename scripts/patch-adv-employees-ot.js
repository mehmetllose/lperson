const fs = require("fs");
const sharp = require("sharp");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

// ── Overtime icon from new asset ──
const iconSrc =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Desktop-yv/assets/c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_64ef05ef-27b7-4e34-a032-433d835535f8-bb4d0909-f9da-4248-849f-8e6161111b80.png";
async function updateOtIcon() {
  if (!fs.existsSync(iconSrc)) return;
  const { data, info } = await sharp(iconSrc)
    .resize(72, 72, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  const ch = info.channels;
  for (let i = 0; i < px.length; i += ch) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2]);
    if (lum < 55) px[i + 3] = 0;
    else {
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = lum < 100 ? Math.round(((lum - 55) / 200) * 255) : 255;
    }
  }
  const buf = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync("c:/Users/PC/Desktop/yv/public/overtime-icon-sm.png", buf);
  h = h.replace(
    /const OVERTIME_ICON_DATA = "data:image\/png;base64,[^"]+";/,
    `const OVERTIME_ICON_DATA = "data:image/png;base64,${buf.toString("base64")}";`
  );
}

// ── CSS: advances mobile + month nav compact ──
if (!h.includes("adv-page-header")) {
  h = h.replace(
    "    .notif-schedule-item { display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;margin-bottom:6px; }",
    `    .month-nav-btn { min-height: auto !important; padding: 6px 10px !important; }
    .adv-month-title-plain { color: var(--text) !important; font-size: 18px; }
    .adv-page-header { margin-bottom: 10px; }
    .adv-page-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 14px; }
    .adv-page-actions .btn { min-height: 34px !important; padding: 6px 12px !important; font-size: 12px !important; }
    @media (max-width: 600px) {
      .month-nav-btn { padding: 5px 8px !important; min-height: 32px !important; }
      .month-nav-btn svg { width: 14px; height: 14px; }
      .adv-month-title-plain { font-size: 16px !important; }
      .adv-page-actions .btn { flex: 1 1 calc(50% - 3px); min-width: 0; justify-content: center; }
      #page-advances .stat-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    }
    .emp-past-row { opacity: 0.92; border-style: dashed; }
    .notif-schedule-item { display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;margin-bottom:6px; }`
  );
}

// ── Advances page HTML ──
h = h.replace(
  `            <motion.div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <div>
                <div class="month-title" id="adv-month-title">—</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="changeAdvMonth(-1)">◀</button>
                <button class="btn btn-secondary btn-sm" onclick="changeAdvMonth(1)">▶</button>
                <span id="adv-add-btn-container"></span>
              </motion.div>
            </div>`,
  `            <div class="month-nav adv-page-header">
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(-1)" aria-label="Önceki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style="text-align:center;flex:1;min-width:0;padding:0 8px;">
                <div class="month-title adv-month-title-plain" id="adv-month-title">—</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(1)" aria-label="Sonraki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div class="adv-page-actions" id="adv-add-btn-container"></div>`
);
// fix if motion.div typo
h = h.replace(
  `<div class="month-nav adv-page-header">
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(-1)" aria-label="Önceki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style="text-align:center;flex:1;min-width:0;padding:0 8px;">
                <div class="month-title adv-month-title-plain" id="adv-month-title">—</motion.div>
              </div>`,
  `<div class="month-nav adv-page-header">
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(-1)" aria-label="Önceki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style="text-align:center;flex:1;min-width:0;padding:0 8px;">
                <div class="month-title adv-month-title-plain" id="adv-month-title">—</div>
              </div>`
);

const advHtmlOld = `            <motion.div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <div>
                <div class="month-title" id="adv-month-title">—</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="changeAdvMonth(-1)">◀</button>
                <button class="btn btn-secondary btn-sm" onclick="changeAdvMonth(1)">▶</button>
                <span id="adv-add-btn-container"></span>
              </div>
            </div>`;
const advHtmlNew = `            <div class="month-nav adv-page-header">
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(-1)" aria-label="Önceki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <motion.div style="text-align:center;flex:1;min-width:0;padding:0 8px;">
                <div class="month-title adv-month-title-plain" id="adv-month-title">—</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm month-nav-btn" onclick="changeAdvMonth(1)" aria-label="Sonraki ay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div class="adv-page-actions" id="adv-add-btn-container"></motion.div>`;
if (h.includes(advHtmlOld)) h = h.replace(advHtmlOld, advHtmlNew.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</motion.div>"));
if (h.includes('id="adv-add-btn-container"></motion.div>')) h = h.replace('id="adv-add-btn-container"></motion.div>', 'id="adv-add-btn-container"></div>');

// renderAdvancesPage title
h = h.replace(
  `document.getElementById("adv-month-title").textContent = \`\${MONTH_NAMES[month]} \${year} — Avans & Ek Kazançlar\`;`,
  `document.getElementById("adv-month-title").textContent = \`\${MONTH_NAMES[month]} \${year}\`;`
);

// launchApp adv buttons - target adv-add-btn-container directly (now a div)
if (h.includes('advAddContainer.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openAddAdvModal()">+ Avans</button><button class="btn btn-secondary btn-sm" onclick="openAddExtraEarnModal()">+ Ek Kazanç</button>`;')) {
  // already ok
}

// ── Employees page structure ──
h = h.replace(
  `            <div id="emp-list"></div>
          </div>

          <!-- OVERVIEW PAGE (patron) -->`,
  `            <motion.div id="emp-list"></div>
            <div id="emp-past-wrap" style="margin-top:28px;display:none;">
              <div class="section-hd" style="margin-bottom:10px;">Geçmiş Personeller</motion.div>
              <div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.45;">İşten çıkarılan personellerin geçmiş çalışma, avans ve rapor kayıtları silinmez.</div>
              <div id="emp-past-list"></div>
            </div>
          </div>

          <!-- OVERVIEW PAGE (patron) -->`
);
h = h.replace('<motion.div id="emp-list"></div>', '<div id="emp-list"></div>');
h = h.replace(/<\/motion\.div>\s*<div id="emp-past-wrap"/, '</div>\n            <div id="emp-past-wrap"');
h = h.replace('<div id="emp-past-wrap" style="margin-top:28px;display:none;">\n              <div class="section-hd" style="margin-bottom:10px;">Geçmiş Personeller</motion.div>', '<div id="emp-past-wrap" style="margin-top:28px;display:none;">\n              <div class="section-hd" style="margin-bottom:10px;">Geçmiş Personeller</div>');

// ── getWorkers + helpers ──
if (!h.includes("function getPastWorkers")) {
  h = h.replace(
    `    function getWorkers() { return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId); }`,
    `    function isActiveWorker(u) {
      return u && u.role === "calisan" && !u.terminatedAt;
    }
    function getWorkers() {
      return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId && !u.terminatedAt);
    }
    function getPastWorkers() {
      return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId && u.terminatedAt);
    }
    function getCompanyCalisan() {
      return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId);
    }`
  );
}

// doLogin block terminated
if (!h.includes("user.terminatedAt")) {
  h = h.replace(
    `      if (!user) {
        const exists = DB?.users?.find(u => matchUser(u));
        showAuthMsg(exists ? "❌ Şifre yanlış." : "❌ Kullanıcı bulunamadı. Yöneticinizden hesap isteyin.");
        return;
      }
      const loginComp = user.role !== "platformAdmin"`,
    `      if (!user) {
        const exists = DB?.users?.find(u => matchUser(u));
        showAuthMsg(exists ? "❌ Şifre yanlış." : "❌ Kullanıcı bulunamadı. Yöneticinizden hesap isteyin.");
        return;
      }
      if (user.role === "calisan" && user.terminatedAt) {
        showAuthMsg("Hesabınız işten çıkarılmış. Patronunuzla iletişime geçin.", "error");
        return;
      }
      const loginComp = user.role !== "platformAdmin"`
  );
}

// renderEmployeesPage - replace whole function
const empFnStart = h.indexOf("    function renderEmployeesPage() {");
const empFnEnd = h.indexOf("    function openAddEmployeeModal() {");
if (empFnStart >= 0 && empFnEnd > empFnStart && !h.includes("terminateEmployee")) {
  const newRender = `    function renderEmployeesPage() {
      const workers = getWorkers();
      const past = getPastWorkers();
      const cur = getCurrency();
      const empRow = (w, pastRow) => {
        const bg = w.color || userAvatar(w.name);
        const initials = w.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
        const totalH = Object.values(getUserRecords(w.id)).reduce((a, v) => a + calcDayHours(v), 0);
        const extraInfo = [
          w.phone ? \`📞 \${escHtml(w.phone)}\` : null,
          w.address ? \`📍 \${escHtml(w.address)}\` : null,
        ].filter(Boolean).join(" · ");
        const jt = (w.jobTitle || "").trim();
        const leftLbl = w.terminatedAt ? \`<div style="font-size:10px;color:var(--text3);margin-top:4px;">Ayrılış: \${escHtml(w.terminatedAt)}\${w.rehiredAt ? " · Son işe dönüş: " + escHtml(w.rehiredAt) : ""}</motion.div>\` : "";
        return \`<div class="emp-row\${pastRow ? " emp-past-row" : ""}">
      <div class="emp-avatar" style="background:\${bg}22;color:\${bg};border:1px solid \${bg}44;">\${initials}</div>
      <div class="emp-info">
        <motion.div class="emp-name">\${escHtml(w.name)}\${jt ? \` <span style="font-size:11px;font-weight:600;color:var(--accent);">· \${escHtml(jt)}</span>\` : ""}</div>
        <div class="emp-meta">@\${w.username} · \${cur}\${w.hourlyRate || getSettings().hourlyRate}/s · Toplam: \${fmtH(totalH)}</div>
        \${extraInfo ? \`<div class="emp-meta" style="margin-top:2px;">\${extraInfo}</div>\` : ""}
        \${leftLbl}
      </div>
      <div class="emp-actions">
        \${pastRow
          ? \`<button class="btn btn-primary btn-sm" onclick="openRehireEmployeeModal('\${w.id}')">Tekrar işe al</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditEmployeeModal('\${w.id}')">Kayıtlar / Düzenle</button>\`
          : \`<button class="btn btn-secondary btn-sm" onclick="openEditEmployeeModal('\${w.id}')">Düzenle</button>
            <button class="btn btn-secondary btn-sm" style="border-color:var(--red);color:var(--red);" onclick="terminateEmployee('\${w.id}')">İşten çıkar</button>\`}
      </div>
    </div>\`;
      };
      if (!workers.length) {
        document.getElementById("emp-list").innerHTML = \`<div class="empty"><div class="empty-icon">👥</div><motion.div class="empty-text">Aktif personel yok.<br>Sağ üstten personel ekleyin.</div></div>\`;
      } else {
        document.getElementById("emp-list").innerHTML = workers.map(w => empRow(w, false)).join("");
      }
      const pastWrap = document.getElementById("emp-past-wrap");
      const pastList = document.getElementById("emp-past-list");
      if (pastWrap && pastList) {
        if (!past.length) {
          pastWrap.style.display = "none";
        } else {
          pastWrap.style.display = "";
          pastList.innerHTML = past.map(w => empRow(w, true)).join("");
        }
      }
    }

    async function terminateEmployee(uid) {
      const w = DB.users.find(u => u.id === uid);
      if (!w || w.terminatedAt) return;
      if (!confirm(\`\${w.name} işten çıkarılsın mı?\\n\\nGeçmiş ay kayıtları, çalışma saatleri ve avanslar silinmez; personel yalnızca aktif listeden kalkar.\`)) return;
      const idx = DB.users.findIndex(u => u.id === uid);
      DB.users[idx] = { ...w, terminatedAt: todayKey(), rehiredAt: null };
      localCacheSave();
      try { await saveUser(uid); } catch (e) { console.warn(e); }
      populateWorkerSelects();
      renderEmployeesPage();
      showToast("Personel işten çıkarıldı — geçmiş kayıtlar korundu");
    }

    function openRehireEmployeeModal(uid) {
      const w = DB.users.find(u => u.id === uid);
      if (!w) return;
      openModal(\`Tekrar İşe Al — \${escHtml(w.name)}\`, \`
    <div style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:14px;">Eski çalışma, avans ve rapor verileri aynen durur.</div>
    <button type="button" class="btn btn-primary btn-full" style="margin-bottom:10px;" onclick="rehireEmployee('\${uid}','never');closeModal();">Hiç ayrılmamış gibi geri al</button>
    <div class="field" style="margin-top:12px;"><label>veya şu tarihten itibaren aktif olsun</label><input type="text" id="rehire-date" value="\${todayKey()}" placeholder="YYYY-MM-DD"/></div>
    <button type="button" class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="rehireEmployeeFromDate('\${uid}')">Seçilen tarihle işe al</button>
  \`, () => true);
    }

    async function rehireEmployee(uid, mode) {
      const w = DB.users.find(u => u.id === uid);
      if (!w) return;
      const idx = DB.users.findIndex(u => u.id === uid);
      if (mode === "never") {
        DB.users[idx] = { ...w, terminatedAt: null, rehiredAt: null };
      }
      localCacheSave();
      try { await saveUser(uid); } catch (e) { console.warn(e); }
      populateWorkerSelects();
      renderEmployeesPage();
      showToast("Personel tekrar aktif ✓");
    }

    async function rehireEmployeeFromDate(uid) {
      const date = (document.getElementById("rehire-date")?.value || "").trim();
      if (!parseYMDLocal(date)) { showToast("Geçerli bir tarih girin (YYYY-MM-DD)", "warn"); return; }
      const w = DB.users.find(u => u.id === uid);
      const idx = DB.users.findIndex(u => u.id === uid);
      DB.users[idx] = { ...w, terminatedAt: null, rehiredAt: date };
      localCacheSave();
      try { await saveUser(uid); } catch (e) { console.warn(e); }
      closeModal();
      populateWorkerSelects();
      renderEmployeesPage();
      showToast("Personel " + date + " tarihinden itibaren aktif ✓");
    }

`;
  // clean motion.div typos in newRender
  const cleanRender = newRender.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</div>");
  h = h.slice(0, empFnStart) + cleanRender + h.slice(empFnEnd);
}

// window exports
if (!h.includes("window.terminateEmployee")) {
  h = h.replace(
    "    window.patronWidgetToggleEnabled = patronWidgetToggleEnabled;",
    "    window.terminateEmployee = terminateEmployee;\n    window.openRehireEmployeeModal = openRehireEmployeeModal;\n    window.rehireEmployee = rehireEmployee;\n    window.rehireEmployeeFromDate = rehireEmployeeFromDate;\n    window.patronWidgetToggleEnabled = patronWidgetToggleEnabled;"
  );
}

async function main() {
  await updateOtIcon();
  fs.writeFileSync(p, h);
  console.log("done", {
    advHeader: h.includes("adv-page-header"),
    pastWorkers: h.includes("getPastWorkers"),
    terminate: h.includes("terminateEmployee"),
  });
}
main().catch(e => { console.error(e); process.exit(1); });
