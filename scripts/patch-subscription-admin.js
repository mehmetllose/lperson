const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

function mustReplace(from, to, label) {
  if (!h.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  h = h.replace(from, to);
}

// ── Blocked screen default copy ──
mustReplace(
  `<motion.div id="sub-block-body" style="font-size:14px;color:var(--text2);line-height:1.6;max-width:360px;margin-bottom:8px;">Bu işyerinin aboneliği sona erdi. Uygulamaya erişim kapatıldı. Yenilemek için lPerson ile iletişime geçin.</div>`,
  `<div id="sub-block-body" style="font-size:14px;color:var(--text2);line-height:1.6;max-width:400px;margin-bottom:8px;">Abonelik süreniz doldu. Kullanıma devam etmek için lütfen aboneliğinizi yenileyin.</motion.div>`,
  "sub-block-body html"
);
// fix if typo
h = h.replace(
  '<motion.div id="sub-block-body"',
  '<div id="sub-block-body"'
);
h = h.replace('yenileyin.</motion.div>', 'yenileyin.</motion.div>'.replace('</motion.div>', '</div>'));

mustReplace(
  `    function isCompanyAccessBlocked(c) {
      return !!(c && c.accessBlocked === true);
    }`,
  `    function formatSubscriptionDaysLabel(days) {
      const n = Math.max(0, Math.floor(Number(days) || 0));
      return n + " Gün Kaldı!";
    }
    function subscriptionProgressForCompany(c) {
      const st = subscriptionStatusForCompany(c);
      if (!c || st.unlimited || st.noEnd) return null;
      const endD = parseYMDLocal(c.subscriptionEndsAt);
      if (!endD) return null;
      const today = stripTimeLocal(new Date());
      const endS = stripTimeLocal(endD);
      let startS = null;
      if (c.subscriptionPeriodStart) {
        const ps = parseYMDLocal(c.subscriptionPeriodStart);
        if (ps) startS = stripTimeLocal(ps);
      }
      if (!startS) {
        const fb = new Date(endS);
        fb.setDate(fb.getDate() - 365);
        startS = stripTimeLocal(fb);
      }
      const total = Math.max(1, Math.round((endS - startS) / 86400000));
      const remaining = Math.max(0, Math.round((endS - today) / 86400000));
      const pct = st.expired ? 0 : Math.min(100, Math.max(0, (remaining / total) * 100));
      return { pct, remaining, total };
    }
    function getSubscriptionBlockedMessage(comp) {
      const st = subscriptionStatusForCompany(comp);
      if (st.expired || comp?.accessBlockedReason === "expiry") {
        return "Abonelik süreniz doldu. Kullanıma devam etmek için lütfen aboneliğinizi yenileyin.";
      }
      return "Erişiminiz kapalı. Kullanıma devam etmek için lütfen aboneliğinizi yenileyin.";
    }
    function isCompanyAccessBlocked(c) {
      if (!c) return false;
      if (c.accessBlocked === true) return true;
      if (c.autoBlockOnExpiry === true) {
        const st = subscriptionStatusForCompany(c);
        if (st.expired) return true;
      }
      return false;
    }
    async function enforceCompanyAutoBlockOnExpiry(comp) {
      if (!comp || comp.subscriptionUnlimited === true || comp.autoBlockOnExpiry !== true) return false;
      const st = subscriptionStatusForCompany(comp);
      if (!st.expired || comp.accessBlocked === true) return false;
      const ix = DB.companies.findIndex(x => x.id === comp.id);
      if (ix < 0) return false;
      const next = { ...comp, accessBlocked: true, accessBlockedReason: "expiry" };
      DB.companies[ix] = next;
      try {
        if (_fbReady) {
          await fsSetDoc("companies", comp.id, { accessBlocked: true, accessBlockedReason: "expiry" });
        }
      } catch (e) { console.warn("autoBlockOnExpiry", e); }
      try { localCacheSave(); } catch (e2) {}
      return true;
    }
    async function enforceAllCompaniesAutoBlockOnExpiry() {
      if (!DB?.companies?.length) return;
      let n = 0;
      for (const c of DB.companies) {
        if (await enforceCompanyAutoBlockOnExpiry(c)) n++;
      }
      return n;
    }`,
  "isCompanyAccessBlocked"
);

mustReplace(
  `        if (body) {
          const st = subscriptionStatusForCompany(comp);
          body.textContent = comp?.accessBlockMessage
            ? String(comp.accessBlockMessage)
            : (st.expired
              ? "Abonelik süreniz doldu. Uygulamaya erişim kapatıldı. Yenilemek için lPerson ile iletişime geçin."
              : "Bu işyerinin erişimi platform yöneticisi tarafından kapatıldı. Yenilemek için lPerson ile iletişime geçin.");
        }`,
  `        if (body) {
          body.textContent = comp?.accessBlockMessage
            ? String(comp.accessBlockMessage)
            : getSubscriptionBlockedMessage(comp);
        }`,
  "showSubscriptionBlockedScreen body"
);

mustReplace(
  `      if (diff > 0) return { label: \`\${diff} gün kaldı\`, days: diff, unlimited: false, noEnd: false, expired: false };
      if (diff === 0) return { label: "Bugün son gün", days: 0, unlimited: false, noEnd: false, expired: false };
      return { label: \`Süresi doldu (\${Math.abs(diff)} gün önce)\`, days: diff, unlimited: false, noEnd: false, expired: true };`,
  `      if (diff > 0) return { label: formatSubscriptionDaysLabel(diff), days: diff, unlimited: false, noEnd: false, expired: false };
      if (diff === 0) return { label: "Bugün Son Gün!", days: 0, unlimited: false, noEnd: false, expired: false };
      return { label: "Abonelik Süresi Doldu", days: diff, unlimited: false, noEnd: false, expired: true };`,
  "subscriptionStatusForCompany labels"
);

// sync hook
mustReplace(
  `        localCacheSave();
        if (currentUser) {
          const fu = DB.users.find(x => x.id === currentUser.id);
          if (fu) currentUser = fu;
          if (currentUser.role === "calisan") applyCalisanNavVisibility();
          if (currentUser.role === "platformAdmin" && typeof currentPage === "string" && currentPage === "platform-admin") {`,
  `        try { await enforceAllCompaniesAutoBlockOnExpiry(); } catch (e) { console.warn("enforceAllCompaniesAutoBlockOnExpiry", e); }
        localCacheSave();
        if (currentUser) {
          const fu = DB.users.find(x => x.id === currentUser.id);
          if (fu) currentUser = fu;
          if (currentUser.role === "calisan") applyCalisanNavVisibility();
          if (currentUser.role === "platformAdmin" && typeof currentPage === "string" && currentPage === "platform-admin") {`,
  "sync enforce auto block"
);

// CSS compact + search
if (!h.includes("pa-company-search")) {
  mustReplace(
    `    .pa-comp-row { margin-bottom:8px !important; padding:8px 10px !important; border-radius:8px !important; }`,
    `    #platform-admin-company-list { max-width: 680px; }
    .pa-company-search { width: 100%; max-width: 680px; margin-bottom: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 12px; font-size: 13px; outline: none; }
    .pa-comp-row { margin-bottom:6px !important; padding:6px 8px !important; border-radius:7px !important; }
    .pa-comp-row > div:first-child { font-size: 14px !important; }
    .pa-comp-row .pa-comp-meta { font-size: 10px !important; margin: 4px 0 6px !important; }
    .pa-comp-row .pa-comp-sub-label { font-size: 12px !important; margin-bottom: 6px !important; }
    .pa-comp-row .pa-comp-switches { gap: 8px 10px !important; margin-bottom: 6px !important; }
    .pa-comp-row .pa-comp-switches span { font-size: 11px !important; }
    .pa-comp-row .pa-days-row { gap: 6px !important; margin-bottom: 6px !important; }
    .pa-comp-row .field { margin-bottom: 5px !important; }
    .pa-comp-row .field input { max-width: 200px !important; padding: 5px 8px !important; font-size: 12px !important; }
    .pa-comp-row details { margin-top: 8px !important; padding-top: 6px !important; }`,
    "pa css"
  );
}

// platform admin search input
mustReplace(
  `              <p style="font-size:11px;color:var(--text3);margin:0 0 14px;">Platform girişi: Firestore’da kullanıcıya <code style="font-size:11px;">role: "platformAdmin"</code> ve boş <code style="font-size:11px;">companyId</code> verin; güvenlik kurallarında bu role yazma izni tanımlayın.</p>
              <div id="platform-admin-company-list"></div>`,
  `              <p style="font-size:11px;color:var(--text3);margin:0 0 10px;">Platform girişi: Firestore’da kullanıcıya <code style="font-size:11px;">role: "platformAdmin"</code> ve boş <code style="font-size:11px;">companyId</code> verin; güvenlik kurallarında bu role yazma izni tanımlayın.</p>
              <input type="search" id="pa-company-search" class="pa-company-search" placeholder="Şirket ara (ad veya ID)…" oninput="renderPlatformAdminPage()" autocomplete="off"/>
              <motion.div id="platform-admin-company-list"></div>`,
  "pa search input"
);
h = h.replace('<motion.div id="platform-admin-company-list"></motion.div>', '<div id="platform-admin-company-list"></div>');

// renderPlatformAdminPage - filter + UI
const renderOldStart = `    function renderPlatformAdminPage() {
      const el = document.getElementById("platform-admin-company-list");
      if (!el || currentUser?.role !== "platformAdmin") return;
      const comps = [...(DB.companies || [])].sort((a, b) =>
        String(a.name || a.id).localeCompare(String(b.name || b.id), "tr"));`;

const renderNewStart = `    function renderPlatformAdminPage() {
      const el = document.getElementById("platform-admin-company-list");
      if (!el || currentUser?.role !== "platformAdmin") return;
      const q = (document.getElementById("pa-company-search")?.value || "").trim().toLowerCase();
      const comps = [...(DB.companies || [])]
        .filter(c => {
          if (!q) return true;
          const name = String(c.name || "").toLowerCase();
          const id = String(c.id || "").toLowerCase();
          return name.includes(q) || id.includes(q);
        })
        .sort((a, b) =>
        String(a.name || a.id).localeCompare(String(b.name || b.id), "tr"));`;

if (h.includes(renderOldStart)) {
  h = h.replace(renderOldStart, renderNewStart);
} else {
  console.error("renderPlatformAdminPage start missing");
  process.exit(1);
}

// Add autoBlock toggle and compact row HTML - replace block in map
const rowChunkOld = `        const showPatron = c.settings && c.settings.showPatronSubscriptionCountdown === true;
        const blocked = c.accessBlocked === true;
        const st = subscriptionStatusForCompany(c);`;

const rowChunkNew = `        const showPatron = c.settings && c.settings.showPatronSubscriptionCountdown === true;
        const autoBlock = c.autoBlockOnExpiry === true;
        const blocked = c.accessBlocked === true;
        const st = subscriptionStatusForCompany(c);`;

mustReplace(rowChunkOld, rowChunkNew, "row vars");

const cardHtmlOld = `        return \`<div class="card pa-comp-row" style="margin-bottom:8px;padding:8px 10px;border:1px solid \${blocked ? "var(--red)" : "var(--border)"};border-radius:8px;" data-pa-cid="\${enc}">
          <div style="font-weight:800;font-size:15px;">\${escHtml(c.name || "—")}</div>
          <div style="font-size:11px;color:var(--text3);margin:6px 0 8px;">Şirket ID: <code style="font-size:11px;">\${escHtml(c.id)}</code> · Patron: \${patrons} · Çalışan: \${cals}</motion.div>
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px;">Abonelik: \${escHtml(st.label)}</div>
          \${blocked ? '<motion.div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px;">Erişim kapalı — kullanıcılar giriş yapamaz</div>' : ''}
          <div style="display:flex;flex-wrap:wrap;gap:12px 16px;margin-bottom:8px;font-size:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="pa-access-block-\${sid}" class="wsp-switch \${blocked ? "on" : ""}" onclick="paToggleAccessBlock('\${enc}')" style="cursor:pointer;flex-shrink:0;" title="Erişimi kapat / aç"><div class="wsp-switch-knob"></div></div>
              <span>Erişimi sonlandır</span>
            </div>
            \${st.expired && !blocked ? '<button type="button" class="btn btn-danger btn-sm" onclick="paToggleAccessBlock(\\''+enc+'\\',true)">Süresi doldu — erişimi kapat</button>' : ''}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:14px 16px;margin-bottom:8px;font-size:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="pa-sub-unlim-\${sid}" class="wsp-switch \${unlim ? "on" : ""}" onclick="paToggleSubSwitch('\${enc}','unlim')" style="cursor:pointer;flex-shrink:0;" title="Aç / kapat"><div class="wsp-switch-knob"></motion.div>
              <span>Süresiz abonelik</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <motion.div id="pa-sub-show-patron-\${sid}" class="wsp-switch \${showPatron ? "on" : ""}" onclick="paToggleSubSwitch('\${enc}','show')" style="cursor:pointer;flex-shrink:0;" title="Aç / kapat"><div class="wsp-switch-knob"></div></div>
              <span>Patron ayarlarda kalan günü görsün</span>
            </div>
          </div>
          <div class="field" style="margin-bottom:8px;">
            <label>Bitiş tarihi (YYYY-MM-DD)</label>
            <input type="text" id="pa-sub-end-\${sid}" value="\${escHtml(end)}" placeholder="ör. 2027-12-31" \${endDisabled}
              style="width:100%;max-width:280px;opacity:\${unlim ? "0.55" : "1"};"/>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;">
            <span style="font-size:11px;color:var(--text3);width:100%;">Hızlı uzat:</span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays(this,7)">+7 gün</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays(this,30)">+30 gün</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays(this,365)">+365 gün</button>
            <input type="number" id="pa-add-days-\${sid}" min="1" max="36500" placeholder="Gün" title="Eklenecek gün"
              style="width:72px;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;color:var(--text);padding:6px 8px;font-size:13px;font-family:var(--font-display);font-weight:700;"/>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformAddCustomDays(this)">Ekle</button>
            <span style="font-size:11px;color:var(--text3);width:100%;margin-top:4px;">Hızlı kısalt:</span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformSubtractSubscriptionDays(this,7)">−7 gün</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformSubtractSubscriptionDays(this,30)">−30 gün</button>
            <input type="number" id="pa-sub-days-\${sid}" min="1" max="36500" placeholder="Gün" title="Çıkarılacak gün"
              style="width:72px;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;color:var(--text);padding:6px 8px;font-size:13px;font-family:var(--font-display);font-weight:700;"/>
            <button type="button" class="btn btn-secondary btn-sm" onclick="platformSubtractCustomDays(this)">Çıkar</button>
          </div>`;

// The cardHtmlOld has intentional typos - use exact from file via smaller replacements
