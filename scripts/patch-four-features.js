const fs = require("fs");
const sharp = require("sharp");

const htmlPath = "c:/Users/PC/Desktop/yv/public/index.html";
const iconSrc =
  "c:/Users/PC/Desktop/yv/assets/c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_15_May_2026_20_44_51-dba4e9a5-9fa7-4ccf-b048-5f1e2fd3c12d.png";

async function main() {
  let h = fs.readFileSync(htmlPath, "utf8");

  if (fs.existsSync(iconSrc)) {
    const buf = await sharp(iconSrc)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    fs.writeFileSync("c:/Users/PC/Desktop/yv/public/overtime-icon-sm.png", buf);
    h = h.replace(
      /const OVERTIME_ICON_DATA = "data:image\/png;base64,[^"]+";/,
      `const OVERTIME_ICON_DATA = "data:image/png;base64,${buf.toString("base64")}";`
    );
  }

  if (!h.includes("function fmtOvertimeUi")) {
    h = h.replace(
      "    function fmtOvertimePdf(h, size) {",
      `    function fmtOvertimeUi(h, size) {
      if (!(h > 0)) return "—";
      return overtimeIconHtml(size || 14) + ' <span style="font-variant-numeric:tabular-nums;">' + Number(h).toFixed(1) + "s</span>";
    }
    function fmtOvertimePdf(h, size) {`
    );
  }

  h = h.replace(
    `\${s.totalOvertimeH > 0 ? s.totalOvertimeH.toFixed(1) + "s" : "—"}`,
    `\${fmtOvertimeUi(s.totalOvertimeH, 14)}`
  );
  h = h.replace(
    `<td style="padding:10px;text-align:right;color:#4ade80;">\${stats.reduce((a,s)=>a+s.totalOvertimeH,0).toFixed(1)}s</td>`,
    `<td style="padding:10px;text-align:right;color:#4ade80;">\${fmtOvertimeUi(stats.reduce((a,s)=>a+s.totalOvertimeH,0), 14)}</td>`
  );

  if (!h.includes("const totalOT = workers.reduce")) {
    h = h.replace(
      `          }, 0);
          pushW("monthly", \`\${cardTitle("📊","Aylık Analiz — "+MONTHS[mo])}
            <motion.div class="pdb-metric-grid4">`,
      `          }, 0);
          const totalOT = workers.reduce((a,w) => a + calcMonthOvertimeHours(w.id, yr, mo), 0);
          pushW("monthly", \`\${cardTitle("📊","Aylık Analiz — "+MONTHS[mo])}
            <div class="pdb-metric-grid4">`
    );
    h = h.replace(
      `          }, 0);
          pushW("monthly", \`\${cardTitle("📊","Aylık Analiz — "+MONTHS[mo])}
            <div class="pdb-metric-grid4">`,
      `          }, 0);
          const totalOT = workers.reduce((a,w) => a + calcMonthOvertimeHours(w.id, yr, mo), 0);
          pushW("monthly", \`\${cardTitle("📊","Aylık Analiz — "+MONTHS[mo])}
            <div class="pdb-metric-grid4">`
    );
    h = h.replace(
      `\${statBox("Toplam Saat", totalH.toFixed(1)+"s", "var(--text)")}
              \${statBox("Toplam Kazanç", fmtMoney(totalGross + ekSum), "#3b82f6")}`,
      `\${statBox("Toplam Saat", totalH.toFixed(1)+"s", "var(--text)")}
              \${statBox("Fazla Mesai", fmtOvertimeUi(totalOT, 16), "#4ade80")}
              \${statBox("Toplam Kazanç", fmtMoney(totalGross + ekSum), "#3b82f6")}`
    );
  }

  h = h.replace(
    `tplStatusHtml = \`<span style="color:#4ade80;font-size:11px;font-weight:700;">🔥 Fazla Mesai: +\${ovH.toFixed(2)}s</span>\`;`,
    `tplStatusHtml = \`<span style="display:inline-flex;align-items:center;gap:5px;color:#4ade80;font-size:11px;font-weight:700;">\${overtimeIconHtml(14)} Fazla Mesai: \${ovH.toFixed(2)}s</span>\`;`
  );

  if (!h.includes(".pa-comp-row { margin-bottom:8px")) {
    h = h.replace(
      "    .pdb-w-cell.pdb-dragging { opacity:0.55; }",
      `    .pdb-w-cell.pdb-dragging { opacity:0.55; }
    .pa-comp-row { margin-bottom:8px !important; padding:8px 10px !important; border-radius:8px !important; }
    .pa-comp-row .field { margin-bottom:6px !important; }
    .pa-comp-row .field label { font-size:10px; margin-bottom:3px; }
    .pa-comp-row .btn-sm { padding:4px 8px !important; font-size:11px !important; }
    @media (max-width: 720px) {
      .pdb-widget-grid, .pdb-widget-grid.pdb-cols-2, .pdb-widget-grid.pdb-cols-3 {
        grid-template-columns: 1fr !important; gap: 8px !important;
      }
      .pdb-w-cell { grid-column: 1 / -1 !important; }
      .pdb-w-cell > .card { min-height: 0 !important; }
      .pdb-metric-grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 6px !important; }
      .pdb-metric-grid4 .stat-value-wrap { font-size: clamp(11px, 3.6vw, 15px) !important; }
      .pdb-stat-row > div { flex: 1 1 calc(50% - 4px) !important; }
    }
    @media (max-width: 400px) {
      .pdb-metric-grid4 { grid-template-columns: 1fr !important; }
      .pdb-stat-row > div { flex: 1 1 100% !important; }
    }`
    );
  }

  const blockedScreen = `  <div id="subscription-blocked-screen" style="display:none;position:fixed;inset:0;z-index:20000;background:var(--bg);flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">⏳</div>
    <div style="font-family:var(--font-display);font-size:22px;font-weight:900;color:var(--text);margin-bottom:8px;">Abonelik süreniz doldu</div>
    <div id="sub-block-body" style="font-size:14px;color:var(--text2);line-height:1.6;max-width:360px;margin-bottom:8px;">Bu işyerinin aboneliği sona erdi. Uygulamaya erişim kapatıldı. Yenilemek için lPerson ile iletişime geçin.</div>
    <div id="sub-block-company" style="font-size:12px;color:var(--text3);margin-bottom:20px;"></div>
    <button type="button" class="btn btn-secondary" onclick="doLogout()">Çıkış yap</button>
  </div>

`;
  if (!h.includes('id="subscription-blocked-screen"')) {
    h = h.replace(
      "  <!-- ═══════════════════ AUTH SCREEN ═══════════════════ -->\n  <div id=\"auth-screen\">",
      blockedScreen.replace(/<motion\.div id="subscription-blocked-screen"/, '<motion.div id="subscription-blocked-screen"').replace(/<motion\.div id="subscription-blocked-screen"/, '<div id="subscription-blocked-screen"') +
        "  <!-- ═══════════════════ AUTH SCREEN ═══════════════════ -->\n  <div id=\"auth-screen\">"
    );
    h = h.replace('<motion.div id="subscription-blocked-screen"', '<div id="subscription-blocked-screen"');
    h = h.replace(/<motion\.div id="subscription-blocked-screen"/g, '<div id="subscription-blocked-screen"');
  }

  if (!h.includes("function isCompanyAccessBlocked")) {
    h = h.replace(
      "    function subscriptionStatusForCompany(c) {",
      `    function isCompanyAccessBlocked(c) {
      return !!(c && c.accessBlocked === true);
    }
    function getCompanyForUser(user) {
      if (!user || !user.companyId) return null;
      return (DB.companies || []).find(x => x.id === user.companyId) || null;
    }
    function checkCompanyAccessOrBlock() {
      if (!currentUser || currentUser.role === "platformAdmin") return true;
      const comp = getCompanyForUser(currentUser);
      if (!isCompanyAccessBlocked(comp)) {
        hideSubscriptionBlockedScreen();
        return true;
      }
      showSubscriptionBlockedScreen(comp);
      return false;
    }
    function showSubscriptionBlockedScreen(comp) {
      const el = document.getElementById("subscription-blocked-screen");
      const auth = document.getElementById("auth-screen");
      const app = document.getElementById("app-screen");
      if (auth) { auth.style.display = "none"; auth.style.visibility = "hidden"; }
      if (app) app.style.display = "none";
      if (el) {
        el.style.display = "flex";
        const co = document.getElementById("sub-block-company");
        const body = document.getElementById("sub-block-body");
        if (co) co.textContent = comp?.name ? "İşyeri: " + comp.name : "";
        if (body) {
          const st = subscriptionStatusForCompany(comp);
          body.textContent = comp?.accessBlockMessage
            ? String(comp.accessBlockMessage)
            : (st.expired
              ? "Abonelik süreniz doldu. Uygulamaya erişim kapatıldı. Yenilemek için lPerson ile iletişime geçin."
              : "Bu işyerinin erişimi platform yöneticisi tarafından kapatıldı. Yenilemek için lPerson ile iletişime geçin.");
        }
      }
    }
    function hideSubscriptionBlockedScreen() {
      const el = document.getElementById("subscription-blocked-screen");
      if (el) el.style.display = "none";
    }
    function subscriptionStatusForCompany(c) {`
    );
  }

  if (!h.includes("loginComp && isCompanyAccessBlocked")) {
    h = h.replace(
      `      currentUser = user;
      const loginTok = "t" + genId();`,
      `      const loginComp = user.role !== "platformAdmin" ? getCompanyForUser(user) : null;
      if (loginComp && isCompanyAccessBlocked(loginComp)) {
        showSubscriptionBlockedScreen(loginComp);
        if (btn) { btn.disabled = false; btn.textContent = "GİRİŞ YAP"; }
        showAuthMsg("Bu işyerinin aboneliği sona erdi. Erişim kapatıldı.", "error");
        return;
      }
      currentUser = user;
      const loginTok = "t" + genId();`
    );
    h = h.replace(
      `    function launchApp() {
      void migrateHideWorkerTodayEarnToPerUser();`,
      `    function launchApp() {
      void migrateHideWorkerTodayEarnToPerUser();
      if (!checkCompanyAccessOrBlock()) return;`
    );
  }

  if (!h.includes("function paToggleAccessBlock")) {
    h = h.replace(
      "    async function platformAddSubscriptionDays(btn, addDays) {",
      `    async function paToggleAccessBlock(encId, forceBlock) {
      if (currentUser?.role !== "platformAdmin") return;
      const cid = decodeURIComponent(encId || "");
      const ix = DB.companies.findIndex(c => c.id === cid);
      if (ix < 0) return;
      const comp = DB.companies[ix];
      const next = forceBlock === true ? true : forceBlock === false ? false : !comp.accessBlocked;
      comp.accessBlocked = next;
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        await fsSetDoc("companies", cid, { accessBlocked: next });
        if (typeof showToast === "function") showToast(next ? "Erişim kapatıldı" : "Erişim yeniden açıldı ✓");
      } catch (e) {
        if (typeof showToast === "function") showToast("Kayıt hatası: " + (e._friendlyMsg || e.message), "warn");
      }
      try { localCacheSave(); } catch (e2) {}
      renderPlatformAdminPage();
    }
    async function platformAddSubscriptionDays(btn, addDays) {`
    );
  }

  if (!h.includes("pa-access-block-")) {
    h = h.replace(
      `        const showPatron = c.settings && c.settings.showPatronSubscriptionCountdown === true;
        const st = subscriptionStatusForCompany(c);`,
      `        const showPatron = c.settings && c.settings.showPatronSubscriptionCountdown === true;
        const blocked = c.accessBlocked === true;
        const st = subscriptionStatusForCompany(c);`
    );
    h = h.replace(
      `        return \`<div class="card pa-comp-row" style="margin-bottom:12px;padding:14px;border:1px solid var(--border);border-radius:12px;" data-pa-cid="\${enc}">`,
      `        return \`<div class="card pa-comp-row" style="margin-bottom:8px;padding:8px 10px;border:1px solid \${blocked ? "var(--red)" : "var(--border)"};border-radius:8px;" data-pa-cid="\${enc}">`
    );
    h = h.replace(
      `          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px;">Abonelik: \${escHtml(st.label)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:14px 20px;margin-bottom:12px;font-size:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="pa-sub-unlim-\${sid}"`,
      `          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px;">Abonelik: \${escHtml(st.label)}</div>
          \${blocked ? '<div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px;">Erişim kapalı — kullanıcılar giriş yapamaz</div>' : ''}
          <div style="display:flex;flex-wrap:wrap;gap:12px 16px;margin-bottom:8px;font-size:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="pa-access-block-\${sid}" class="wsp-switch \${blocked ? "on" : ""}" onclick="paToggleAccessBlock('\${enc}')" style="cursor:pointer;flex-shrink:0;" title="Erişimi kapat / aç"><div class="wsp-switch-knob"></div></div>
              <span>Erişimi sonlandır</span>
            </div>
            \${st.expired && !blocked ? '<button type="button" class="btn btn-danger btn-sm" onclick="paToggleAccessBlock(\\''+enc+'\\',true)">Süresi doldu — erişimi kapat</button>' : ''}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:14px 16px;margin-bottom:8px;font-size:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="pa-sub-unlim-\${sid}"`
    );
    h = h.replace(
      `\${blocked ? '<motion.div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px;">Erişim kapalı — kullanıcılar giriş yapamaz</div>' : ''}`,
      `\${blocked ? '<div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px;">Erişim kapalı — kullanıcılar giriş yapamaz</div>' : ''}`
    );
  }

  if (!h.includes("accessBlocked: accessBlocked")) {
    h = h.replace(
      `      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
      const ix = DB.companies.findIndex(c => c.id === cid);
      if (ix < 0) return;
      const comp = DB.companies[ix];
      comp.planLabel = planLabel || "";
      comp.subscriptionUnlimited = unlim;
      if (!comp.settings) comp.settings = {};
      comp.settings.showPatronSubscriptionCountdown = showPatron;
      if (unlim) {
        delete comp.subscriptionEndsAt;
      } else if (subscriptionEndsAt) {
        comp.subscriptionEndsAt = subscriptionEndsAt;
      } else {
        delete comp.subscriptionEndsAt;
      }
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        const toFs = {
          planLabel: comp.planLabel,
          subscriptionUnlimited: unlim,
          settings: { ...(comp.settings || {}), showPatronSubscriptionCountdown: showPatron },
        };`,
      `      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
      const blockEl = document.getElementById("pa-access-block-" + sid);
      const accessBlocked = !!(blockEl && blockEl.classList.contains("on"));
      const ix = DB.companies.findIndex(c => c.id === cid);
      if (ix < 0) return;
      const comp = DB.companies[ix];
      comp.planLabel = planLabel || "";
      comp.subscriptionUnlimited = unlim;
      comp.accessBlocked = accessBlocked;
      if (!comp.settings) comp.settings = {};
      comp.settings.showPatronSubscriptionCountdown = showPatron;
      if (unlim) {
        delete comp.subscriptionEndsAt;
      } else if (subscriptionEndsAt) {
        comp.subscriptionEndsAt = subscriptionEndsAt;
      } else {
        delete comp.subscriptionEndsAt;
      }
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        const toFs = {
          planLabel: comp.planLabel,
          subscriptionUnlimited: unlim,
          accessBlocked: accessBlocked,
          settings: { ...(comp.settings || {}), showPatronSubscriptionCountdown: showPatron },
        };`
    );
  }

  if (!h.includes("window.paToggleAccessBlock")) {
    h = h.replace(
      "    window.platformAddSubscriptionDays = platformAddSubscriptionDays;",
      "    window.paToggleAccessBlock = paToggleAccessBlock;\n    window.platformAddSubscriptionDays = platformAddSubscriptionDays;"
    );
  }

  fs.writeFileSync(htmlPath, h);
  console.log("ok", {
    icon: h.includes("OVERTIME_ICON_DATA"),
    fmtOvertimeUi: h.includes("fmtOvertimeUi"),
    blocked: h.includes("subscription-blocked-screen"),
    pa: h.includes("pa-access-block-"),
  });
}

main().catch(e => { console.error(e); process.exit(1); });
