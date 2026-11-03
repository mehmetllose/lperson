const fs = require("fs");
const path = "c:/Users/PC/Desktop/yv/public/index.html";
let s = fs.readFileSync(path, "utf8");

const cssBlock = `
    /* Personel durum — hafif SVG animasyonlar (CSS only) */
    .lp-status-anim {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: currentColor;
      vertical-align: middle;
    }
    .lp-status-anim--sm { width: 26px; height: 22px; }
    .lp-status-anim--md { width: 40px; height: 32px; }
    .lp-status-anim--lg { width: 56px; height: 44px; }
    .lp-status-anim svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .lp-status-anim-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      padding: 6px;
    }
    .lp-status-anim-wrap--lg { width: 68px; height: 56px; border-radius: 14px; }
    .status-bar .lp-status-anim { margin-right: 2px; }
    .status-bar { gap: 6px; }
    .status-planned {
      background: rgba(91, 156, 246, 0.1);
      border: 1px solid rgba(91, 156, 246, 0.32);
      color: #7eb6ff;
    }
    .pdb-shift-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    @keyframes lp-type {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-12deg); }
    }
    @keyframes lp-walk-l {
      0%, 100% { transform: rotate(18deg); }
      50% { transform: rotate(-14deg); }
    }
    @keyframes lp-walk-r {
      0%, 100% { transform: rotate(-14deg); }
      50% { transform: rotate(18deg); }
    }
    @keyframes lp-walk-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-1.5px); }
    }
    @keyframes lp-case-swing {
      0%, 100% { transform: rotate(6deg); }
      50% { transform: rotate(-8deg); }
    }
    @keyframes lp-blanket {
      0%, 100% { transform: scaleY(1); opacity: 0.92; }
      50% { transform: scaleY(1.03); opacity: 1; }
    }
    @keyframes lp-zzz {
      0%, 100% { opacity: 0.25; transform: translateY(0); }
      50% { opacity: 0.85; transform: translateY(-3px); }
    }
    .lp-status-anim--working .lp-arm-type {
      transform-origin: 24px 20px;
      animation: lp-type 1.1s ease-in-out infinite;
    }
    .lp-status-anim--working .lp-screen { animation: lp-zzz 2.4s ease-in-out infinite; }
    .lp-status-anim--planned .lp-walker { animation: lp-walk-bob 0.55s ease-in-out infinite; }
    .lp-status-anim--planned .lp-leg--l {
      transform-origin: 32px 26px;
      animation: lp-walk-l 0.55s ease-in-out infinite;
    }
    .lp-status-anim--planned .lp-leg--r {
      transform-origin: 32px 26px;
      animation: lp-walk-r 0.55s ease-in-out infinite;
    }
    .lp-status-anim--planned .lp-case {
      transform-origin: 44px 25px;
      animation: lp-case-swing 0.55s ease-in-out infinite;
    }
    .lp-status-anim--rest .lp-blanket-path {
      transform-origin: 32px 34px;
      animation: lp-blanket 2.8s ease-in-out infinite;
    }
    .lp-status-anim--rest .lp-zzz-a { animation: lp-zzz 2s ease-in-out infinite; }
    .lp-status-anim--rest .lp-zzz-b { animation: lp-zzz 2s ease-in-out 0.35s infinite; }
    .lp-status-anim--rest .lp-zzz-c { animation: lp-zzz 2s ease-in-out 0.7s infinite; }
    @media (prefers-reduced-motion: reduce) {
      .lp-status-anim--working .lp-arm-type,
      .lp-status-anim--working .lp-screen,
      .lp-status-anim--planned .lp-walker,
      .lp-status-anim--planned .lp-leg--l,
      .lp-status-anim--planned .lp-leg--r,
      .lp-status-anim--planned .lp-case,
      .lp-status-anim--rest .lp-blanket-path,
      .lp-status-anim--rest .lp-zzz-a,
      .lp-status-anim--rest .lp-zzz-b,
      .lp-status-anim--rest .lp-zzz-c { animation: none !important; }
    }
`;

const jsBlock = `
    const LP_STATUS_SVG = {
      working: '<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="36" x2="58" y2="36"/><line x1="40" y1="36" x2="40" y2="30"/><rect class="lp-screen" x="42" y="16" width="16" height="12" rx="1.5" fill="rgba(74,222,128,0.12)" stroke="currentColor"/><line x1="44" y1="20" x2="54" y2="20" opacity="0.5"/><line x1="44" y1="24" x2="51" y2="24" opacity="0.35"/><circle cx="22" cy="14" r="3.2"/><line x1="22" y1="17" x2="22" y2="28"/><line x1="22" y1="20" x2="16" y2="26"/><line x1="22" y1="20" x2="34" y2="24" class="lp-arm-type"/><line x1="22" y1="28" x2="18" y2="36"/><line x1="22" y1="28" x2="26" y2="34"/></svg>',
      planned: '<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="lp-walker"><circle cx="28" cy="11" r="3.2"/><line x1="28" y1="14" x2="28" y2="27"/><line x1="28" y1="19" x2="20" y2="24"/><line x1="28" y1="19" x2="34" y2="23"/><line x1="28" y1="27" x2="22" y2="38" class="lp-leg lp-leg--l"/><line x1="28" y1="27" x2="34" y2="38" class="lp-leg lp-leg--r"/><rect class="lp-case" x="36" y="22" width="9" height="7" rx="1.2" fill="rgba(91,156,246,0.15)"/><line x1="40" y1="22" x2="40" y2="19"/></g><line x1="4" y1="40" x2="60" y2="40" opacity="0.25" stroke-dasharray="3 4"/></svg>',
      rest: '<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="36" x2="56" y2="36"/><path d="M10 36 L14 32 L20 32" opacity="0.5"/><circle cx="22" cy="30" r="3"/><path class="lp-blanket-path" d="M18 34 Q32 27 50 34 L50 36 L18 36 Z" fill="currentColor" fill-opacity="0.12"/><line x1="26" y1="32" x2="38" y2="32" opacity="0.35"/><text class="lp-zzz-a" x="44" y="16" font-size="7" font-weight="700" fill="currentColor" stroke="none">z</text><text class="lp-zzz-b" x="50" y="11" font-size="6" font-weight="700" fill="currentColor" stroke="none" opacity="0.7">z</text><text class="lp-zzz-c" x="54" y="7" font-size="5" font-weight="700" fill="currentColor" stroke="none" opacity="0.45">z</text></svg>',
    };
    function getWorkerTodayStatusKind(uid) {
      if (!uid) return "idle";
      const today = todayKey();
      const rec = normalizeRec((getUserRecords(uid) || {})[today]);
      if (rec.leaveType) return "rest";
      const hasOpen = rec.shifts.some(s => s.start && !s.end);
      if (hasOpen) return "working";
      const hasAny = rec.shifts.some(s => s.start);
      if (hasAny && !hasOpen) return "rest";
      const tpl = typeof getEffectiveShiftTemplate === "function" ? getEffectiveShiftTemplate(today, uid) : null;
      if (tpl && tpl.startTime) return "planned";
      return "idle";
    }
    function workerStatusAnimHtml(kind, size) {
      if (!kind || kind === "idle" || !LP_STATUS_SVG[kind]) return "";
      const sz = size === "lg" || size === "md" || size === "sm" ? size : "md";
      const labels = { working: "Çalışıyor", planned: "Planlı", rest: "Dinleniyor" };
      return '<span class="lp-status-anim lp-status-anim--' + sz + ' lp-status-anim--' + kind + '" role="img" aria-label="' + (labels[kind] || "") + '">' + LP_STATUS_SVG[kind] + '</span>';
    }
    function setTodayStatusBadge(el, kind, label) {
      if (!el) return;
      const map = { working: "status-working", planned: "status-planned", rest: "status-done", idle: "status-idle" };
      el.className = "status-bar " + (map[kind] || "status-idle");
      const anim = workerStatusAnimHtml(kind, "sm");
      el.innerHTML = anim ? anim + "<span>" + label + "</span>" : label;
    }
    function refreshTodayStatusAnim(uid) {
      const kind = getWorkerTodayStatusKind(uid);
      const animWrap = document.getElementById("today-status-anim");
      if (animWrap) {
        animWrap.innerHTML = kind === "idle" ? "" : workerStatusAnimHtml(kind, "lg");
        animWrap.style.display = kind === "idle" ? "none" : "";
      }
      const dbAnim = document.getElementById("db-status-anim");
      if (dbAnim && currentUser && currentUser.role === "calisan" && uid === currentUser.id) {
        dbAnim.innerHTML = kind === "idle" ? "" : workerStatusAnimHtml(kind, "md");
        dbAnim.style.display = kind === "idle" ? "none" : "";
      }
      return kind;
    }
`;

let ok = true;

if (!s.includes(".lp-status-anim")) {
  if (!s.includes(".status-idle {\n      background: var(--bg3);")) {
    console.error("CSS anchor missing");
    ok = false;
  } else {
    s = s.replace(
      "    .status-idle {\n      background: var(--bg3);\n      border: 1px solid var(--border);\n      color: var(--text3);\n    }",
      "    .status-idle {\n      background: var(--bg3);\n      border: 1px solid var(--border);\n      color: var(--text3);\n    }\n" + cssBlock
    );
  }
}

if (!s.includes("LP_STATUS_SVG")) {
  if (!s.includes("    function renderTodayPage() {")) {
    console.error("JS anchor missing");
    ok = false;
  } else {
    s = s.replace("    function renderTodayPage() {", jsBlock + "\n    function renderTodayPage() {");
  }
}

if (!s.includes('id="today-status-anim"')) {
  const todayOld = `              <motion.div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;"
                  id="today-label">Bugün</div>
                <div id="today-status-badge"`;
  const todayNew = `              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
                  <div id="today-status-anim" class="lp-status-anim-wrap lp-status-anim-wrap--lg" style="display:none;"></div>
                  <motion.div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;"
                    id="today-label">Bugün</div>
                </div>
                <div id="today-status-badge"`;
  const todayOld2 = todayOld.replace(/<motion\.div/g, "<motion.div").replace(/<\/motion\.div>/g, "</div>");
  const todayOldClean = `              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;"
                  id="today-label">Bugün</div>
                <div id="today-status-badge"`;
  const todayNewClean = `              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
                  <div id="today-status-anim" class="lp-status-anim-wrap lp-status-anim-wrap--lg" style="display:none;"></div>
                  <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;"
                    id="today-label">Bugün</div>
                </div>
                <div id="today-status-badge"`;
  if (s.includes(todayOldClean)) s = s.replace(todayOldClean, todayNewClean);
  else { console.error("today HTML anchor missing"); ok = false; }
}

if (!s.includes('id="db-status-anim"')) {
  const dbOld = `              <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;margin-bottom:12px;">
                <div id="db-avatar"`;
  const dbNew = `              <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;margin-bottom:12px;">
                <div id="db-status-anim" class="lp-status-anim-wrap" style="display:none;width:52px;height:52px;padding:8px;box-sizing:border-box;"></div>
                <div id="db-avatar"`;
  if (s.includes(dbOld)) s = s.replace(dbOld, dbNew);
  else { console.error("db HTML anchor missing"); ok = false; }
}

if (s.includes('sb.innerHTML = "● Çalışıyor"')) {
  s = s.replace(
    `      const sb = document.getElementById("today-status-badge");
      if (hasOpen) { sb.className = "status-bar status-working"; sb.innerHTML = "● Çalışıyor"; }
      else if (hasDone) { sb.className = "status-bar status-done"; sb.innerHTML = "✓ Tamamlandı"; }
      else { sb.className = "status-bar status-idle"; sb.innerHTML = "Başlamadı"; }`,
    `      const sb = document.getElementById("today-status-badge");
      const statusKind = refreshTodayStatusAnim(worker.id);
      if (statusKind === "working") setTodayStatusBadge(sb, "working", "Çalışıyor");
      else if (statusKind === "rest") setTodayStatusBadge(sb, "rest", "Mesai bitti");
      else if (statusKind === "planned") setTodayStatusBadge(sb, "planned", "Planlı");
      else setTodayStatusBadge(sb, "idle", "Başlamadı");`
  );
}

const shiftOld = `            return \`<motion.div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <div style="width:30px;height:30px;border-radius:50%;background:\${col}22;color:\${col};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;">\${init}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${escHtml(w.name)}</div>
                <div style="font-size:11px;color:var(--text3);">\${tpl.startTime}\${tpl.endTime?" – "+tpl.endTime:""} · \${tpl.name||"Vardiya"}</div>
              </div>
              \${badge}
            </div>\`;`;
const shiftOldClean = shiftOld.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</div>");
const shiftNew = `            const sk = isActive ? "working" : isDone ? "rest" : "planned";
            return \`<div class="pdb-shift-row">
              <div style="width:30px;height:30px;border-radius:50%;background:\${col}22;color:\${col};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">\${init}</motion.div>
              \${workerStatusAnimHtml(sk, "sm")}
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${escHtml(w.name)}</div>
                <div style="font-size:11px;color:var(--text3);">\${tpl.startTime}\${tpl.endTime?" – "+tpl.endTime:""} · \${tpl.name||"Vardiya"}</div>
              </div>
              \${badge}
            </div>\`;`;
const shiftNewClean = shiftNew.replace(/<\/motion\.div>/g, "</div>");

if (s.includes(shiftOldClean)) s = s.replace(shiftOldClean, shiftNewClean);
else if (!s.includes("workerStatusAnimHtml(sk")) { console.error("shift row anchor missing"); ok = false; }

// renderDashboardPage — refresh anim for calisan
if (!s.includes("refreshTodayStatusAnim(u.id)") && s.includes("      if (qrDash) qrDash.style.display = showCalisanDashQrButton()")) {
  s = s.replace(
    "      if (qrDash) qrDash.style.display = showCalisanDashQrButton() ? \"flex\" : \"none\";",
    "      if (qrDash) qrDash.style.display = showCalisanDashQrButton() ? \"flex\" : \"none\";\n      try { refreshTodayStatusAnim(u.id); } catch (e) {}"
  );
}

fs.writeFileSync(path, s);
console.log(ok ? "done" : "done with warnings");
