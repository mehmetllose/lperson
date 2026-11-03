const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

h = h.replace(
  `    function paToggleSubSwitch(encCid, which) {
      const el = document.getElementById(which === "unlim" ? "pa-sub-unlim-" + paSafeDomId(decodeURIComponent(encCid)) : "pa-sub-show-patron-" + paSafeDomId(decodeURIComponent(encCid)));
      if (!el) return;`,
  `    function paToggleSubSwitch(encCid, which) {
      const sid = paSafeDomId(decodeURIComponent(encCid));
      const elId = which === "unlim" ? "pa-sub-unlim-" + sid : which === "autoblock" ? "pa-auto-block-" + sid : "pa-sub-show-patron-" + sid;
      const el = document.getElementById(elId);
      if (!el) return;`
);

h = h.replace(
  `      const showPatronEl = document.getElementById("pa-sub-show-patron-" + sid);
      const endEl = document.getElementById("pa-sub-end-" + sid);
      const planEl = document.getElementById("pa-plan-" + sid);
      const unlim = !!(unlimEl && unlimEl.classList.contains("on"));
      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
      const subscriptionEndsAt = (endEl?.value || "").trim();
      const planLabel = (planEl?.value || "").trim();
      comp.planLabel = planLabel || "";
      comp.subscriptionUnlimited = unlim;
      if (!comp.settings) comp.settings = {};
      comp.settings.showPatronSubscriptionCountdown = showPatron;
      if (unlim) delete comp.subscriptionEndsAt;
      else if (subscriptionEndsAt) comp.subscriptionEndsAt = subscriptionEndsAt;
      try {
        if (!_fbReady) return;
        const toFs = {
          planLabel: comp.planLabel,
          subscriptionUnlimited: unlim,
          settings: { ...(comp.settings || {}), showPatronSubscriptionCountdown: showPatron },
        };`,
  `      const showPatronEl = document.getElementById("pa-sub-show-patron-" + sid);
      const autoBlockEl = document.getElementById("pa-auto-block-" + sid);
      const endEl = document.getElementById("pa-sub-end-" + sid);
      const planEl = document.getElementById("pa-plan-" + sid);
      const unlim = !!(unlimEl && unlimEl.classList.contains("on"));
      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
      const autoBlockOnExpiry = !!(autoBlockEl && autoBlockEl.classList.contains("on"));
      const subscriptionEndsAt = (endEl?.value || "").trim();
      const planLabel = (planEl?.value || "").trim();
      comp.planLabel = planLabel || "";
      comp.subscriptionUnlimited = unlim;
      comp.autoBlockOnExpiry = autoBlockOnExpiry;
      if (!comp.settings) comp.settings = {};
      comp.settings.showPatronSubscriptionCountdown = showPatron;
      if (unlim) delete comp.subscriptionEndsAt;
      else if (subscriptionEndsAt) comp.subscriptionEndsAt = subscriptionEndsAt;
      try {
        if (!_fbReady) return;
        const toFs = {
          planLabel: comp.planLabel,
          subscriptionUnlimited: unlim,
          autoBlockOnExpiry: autoBlockOnExpiry,
          settings: { ...(comp.settings || {}), showPatronSubscriptionCountdown: showPatron },
        };`
);

h = h.replace(
  `      const showPatronEl = document.getElementById("pa-sub-show-patron-" + sid);
      const subscriptionEndsAt = (endEl?.value || "").trim();
      const planLabel = (planEl?.value || "").trim();
      const unlim = !!(unlimEl && unlimEl.classList.contains("on"));
      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
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
        };`,
  `      const showPatronEl = document.getElementById("pa-sub-show-patron-" + sid);
      const autoBlockEl = document.getElementById("pa-auto-block-" + sid);
      const subscriptionEndsAt = (endEl?.value || "").trim();
      const planLabel = (planEl?.value || "").trim();
      const unlim = !!(unlimEl && unlimEl.classList.contains("on"));
      const showPatron = !!(showPatronEl && showPatronEl.classList.contains("on"));
      const autoBlockOnExpiry = !!(autoBlockEl && autoBlockEl.classList.contains("on"));
      const blockEl = document.getElementById("pa-access-block-" + sid);
      const accessBlocked = !!(blockEl && blockEl.classList.contains("on"));
      const ix = DB.companies.findIndex(c => c.id === cid);
      if (ix < 0) return;
      const comp = DB.companies[ix];
      comp.planLabel = planLabel || "";
      comp.subscriptionUnlimited = unlim;
      comp.accessBlocked = accessBlocked;
      comp.autoBlockOnExpiry = autoBlockOnExpiry;
      if (!comp.settings) comp.settings = {};
      comp.settings.showPatronSubscriptionCountdown = showPatron;
      if (unlim) {
        delete comp.subscriptionEndsAt;
        delete comp.subscriptionPeriodStart;
      } else if (subscriptionEndsAt) {
        const prevEnd = comp.subscriptionEndsAt;
        comp.subscriptionEndsAt = subscriptionEndsAt;
        if (!comp.subscriptionPeriodStart || prevEnd !== subscriptionEndsAt) {
          comp.subscriptionPeriodStart = fmtYMDLocal(stripTimeLocal(new Date()));
        }
      } else {
        delete comp.subscriptionEndsAt;
      }
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        const toFs = {
          planLabel: comp.planLabel,
          subscriptionUnlimited: unlim,
          accessBlocked: accessBlocked,
          autoBlockOnExpiry: autoBlockOnExpiry,
          settings: { ...(comp.settings || {}), showPatronSubscriptionCountdown: showPatron },
        };`
);

// add subscriptionPeriodStart to toFs in savePlatformCompanyRowFromBtn - after toFs block we need to add field
h = h.replace(
  `        if (unlim) {
          toFs.subscriptionEndsAt = firebase.firestore.FieldValue.delete();
        } else if (subscriptionEndsAt) {
          toFs.subscriptionEndsAt = subscriptionEndsAt;
        } else {
          toFs.subscriptionEndsAt = firebase.firestore.FieldValue.delete();
        }
        await fsSetDoc("companies", cid, toFs);
        if (typeof showToast === "function") showToast("Şirket kaydedildi ✓");`,
  `        if (unlim) {
          toFs.subscriptionEndsAt = firebase.firestore.FieldValue.delete();
          toFs.subscriptionPeriodStart = firebase.firestore.FieldValue.delete();
        } else if (subscriptionEndsAt) {
          toFs.subscriptionEndsAt = subscriptionEndsAt;
          if (comp.subscriptionPeriodStart) toFs.subscriptionPeriodStart = comp.subscriptionPeriodStart;
        } else {
          toFs.subscriptionEndsAt = firebase.firestore.FieldValue.delete();
        }
        if (accessBlocked && comp.accessBlockedReason) toFs.accessBlockedReason = comp.accessBlockedReason;
        else if (!accessBlocked) toFs.accessBlockedReason = firebase.firestore.FieldValue.delete();
        await fsSetDoc("companies", cid, toFs);
        if (autoBlockOnExpiry) await enforceCompanyAutoBlockOnExpiry(DB.companies[ix]);
        if (typeof showToast === "function") showToast("Şirket kaydedildi ✓");`
);

h = h.replace(
  `      const next = forceBlock === true ? true : forceBlock === false ? false : !comp.accessBlocked;
      comp.accessBlocked = next;
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        await fsSetDoc("companies", cid, { accessBlocked: next });`,
  `      const next = forceBlock === true ? true : forceBlock === false ? false : !comp.accessBlocked;
      comp.accessBlocked = next;
      if (next) {
        const st = subscriptionStatusForCompany(comp);
        comp.accessBlockedReason = st.expired ? "expiry" : "manual";
      } else {
        delete comp.accessBlockedReason;
      }
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        const patch = { accessBlocked: next };
        if (next) patch.accessBlockedReason = comp.accessBlockedReason;
        else patch.accessBlockedReason = firebase.firestore.FieldValue.delete();
        await fsSetDoc("companies", cid, patch);`
);

h = h.replace(
  `      DB.companies[ix] = { ...comp, subscriptionUnlimited: false, subscriptionEndsAt: newEnd };
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        await fsSetDoc("companies", cid, {
          subscriptionUnlimited: false,
          subscriptionEndsAt: newEnd,
        });`,
  `      const today = fmtYMDLocal(stripTimeLocal(new Date()));
      const periodStart = subscriptionStatusForCompany(comp).expired || !comp.subscriptionPeriodStart ? today : comp.subscriptionPeriodStart;
      DB.companies[ix] = { ...comp, subscriptionUnlimited: false, subscriptionEndsAt: newEnd, subscriptionPeriodStart: periodStart };
      try {
        if (!_fbReady) throw new Error("Firebase hazır değil");
        await fsSetDoc("companies", cid, {
          subscriptionUnlimited: false,
          subscriptionEndsAt: newEnd,
          subscriptionPeriodStart: periodStart,
        });`
);

h = h.replace(
  `        showAuthMsg("Bu işyerinin aboneliği sona erdi. Erişim kapatıldı.", "error");`,
  `        showAuthMsg(getSubscriptionBlockedMessage(loginComp), "error");`
);

// patron widget
h = h.replace(
  `      { id: "missing",        label: "Eksik Giriş Uyarıları",    desc: "Bu ay giriş kaydı olmayan çalışma günleri.",                     icon: "⚠️" },
    ];`,
  `      { id: "missing",        label: "Eksik Giriş Uyarıları",    desc: "Bu ay giriş kaydı olmayan çalışma günleri.",                     icon: "⚠️" },
      { id: "subscription",   label: "Kalan Abonelik Süresi",    desc: "Abonelik bitişine kalan gün ve süre çubuğu.",                    icon: "⏳" },
    ];`
);

h = h.replace(
  `        PATRON_WIDGET_DEFS.map(w => {`,
  `        (getSettings().showPatronSubscriptionCountdown ? PATRON_WIDGET_DEFS : PATRON_WIDGET_DEFS.filter(w => w.id !== "subscription")).map(w => {`
);

h = h.replace(
  `      order.forEach(wid => {

        // ── early_late ──`,
  `      order.forEach(wid => {

        if (wid === "subscription") {
          if (!getSettings().showPatronSubscriptionCountdown) return;
          const compSub = getCompany();
          const stSub = subscriptionStatusForCompany(compSub);
          let subInner = cardTitle("⏳", "Abonelik");
          if (stSub.unlimited) {
            subInner += '<div style="font-weight:800;color:var(--accent);">Süresiz abonelik aktif.</motion.div>';
          } else if (stSub.noEnd) {
            subInner += '<div style="color:var(--text3);">Bitiş tarihi henüz tanımlanmadı.</div>';
          } else {
            subInner += '<div style="font-size:20px;font-weight:900;color:var(--text);">' + escHtml(stSub.label) + '</div>';
            subInner += subscriptionProgressBarHtml(compSub);
            if (compSub?.subscriptionEndsAt) {
              subInner += '<motion.div style="font-size:10px;color:var(--text3);margin-top:8px;">Bitiş: <code>' + escHtml(String(compSub.subscriptionEndsAt)) + '</code></div>';
            }
          }
          pushW("subscription", subInner);
          return;
        }

        // ── early_late ──`
);

h = h.replace(
  `      } else {
        html = "<div style=\\"font-size:16px;font-weight:800;color:var(--text);\\">" + escHtml(st.label) + "</div>";
      }
      if (comp && comp.subscriptionEndsAt && !st.unlimited) {
        html += "<div style=\\"font-size:11px;color:var(--text3);margin-top:8px;\\">Bitiş tarihi: <code>" + escHtml(String(comp.subscriptionEndsAt)) + "</code></div>";
      }
      body.innerHTML = html;`,
  `      } else {
        html = "<div style=\\"font-size:16px;font-weight:800;color:var(--text);\\">" + escHtml(st.label) + "</div>";
        html += subscriptionProgressBarHtml(comp);
      }
      if (comp && comp.subscriptionEndsAt && !st.unlimited) {
        html += "<div style=\\"font-size:11px;color:var(--text3);margin-top:8px;\\">Bitiş tarihi: <code>" + escHtml(String(comp.subscriptionEndsAt)) + "</code></div>";
      }
      body.innerHTML = html;`
);

h = h.split("motion.div").join("motion.div");
h = h.split("motion.div").join("div");
h = h.split("</motion.div>").join("</div>");

fs.writeFileSync(p, h);
console.log("logic ok", {
  autoblockToggle: h.includes("autoblock"),
  subscriptionWidget: h.includes('wid === "subscription"'),
  progressPatron: h.includes("subscriptionProgressBarHtml(comp)"),
});
