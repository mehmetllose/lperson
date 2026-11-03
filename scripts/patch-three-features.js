const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

function rep(old, neu) {
  if (!h.includes(old)) return false;
  h = h.replace(old, neu);
  return true;
}

// --- Notifications ---
rep(
  `<motion.div class="page" id="page-worker-notifications">
            <div class="section-hd" style="margin-bottom:12px;">Bildirimler</div>`,
  `<div class="page" id="page-worker-notifications">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
              <motion.div class="section-hd" style="margin:0;">Bildirimler</div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri sıfırla</button>
            </div>`
);
h = h.replace('<motion.div class="section-hd" style="margin:0;">Bildirimler</div>', '<div class="section-hd" style="margin:0;">Bildirimler</motion.div>').replace('</motion.div>', '</div>').replace('<div class="section-hd" style="margin:0;">Bildirimler</motion.div>', '<div class="section-hd" style="margin:0;">Bildirimler</div>');

if (!h.includes("function clearWorkerNotifications")) {
  rep(
    `    function renderWorkerNotificationsPage() {
      const el = document.getElementById("worker-notifications-list");
      if (!el || currentUser?.role !== "calisan") return;`,
    `    function clearWorkerNotifications() {
      if (currentUser?.role !== "calisan") return;
      if (!confirm("Bu cihazdaki bildirim geçmişi silinsin mi?")) return;
      try { localStorage.removeItem(WORKER_FEED_KEY + "_" + currentUser.id); } catch (e) {}
      renderWorkerNotificationsPage();
      showToast("Bildirimler sıfırlandı ✓");
    }
    function renderWorkerNotificationsPage() {
      const el = document.getElementById("worker-notifications-list");
      if (!el || currentUser?.role !== "calisan") return;`
  );
}
if (!h.includes("window.clearWorkerNotifications")) {
  rep(
    "window.renderPatronActiveLeavesList = renderPatronActiveLeavesList;",
    "window.renderPatronActiveLeavesList = renderPatronActiveLeavesList;\n    window.clearWorkerNotifications = clearWorkerNotifications;"
  );
}

// Fix notifications page if still old
if (!h.includes("clearWorkerNotifications()")) {
  rep(
    `<div class="page" id="page-worker-notifications">
            <div class="section-hd" style="margin-bottom:12px;">Bildirimler</div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5;">Giriş/çıkış, talep sonuçları ve hatırlatmalar bu cihazda toplanır.</motion.div>`,
    `<div class="page" id="page-worker-notifications">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
              <div class="section-hd" style="margin:0;">Bildirimler</div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri sıfırla</button>
            </div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5;">Giriş/çıkış, talep sonuçları ve hatırlatmalar bu cihazda toplanır.</div>`
  );
}

// --- Analytics overtime column ---
if (!h.includes("Fazla Mesai</th>")) {
  rep(
    `<th style="padding:8px 10px;text-align:right;font-weight:700;">Saat</th>
                <th style="padding:8px 10px;text-align:right;font-weight:700;">Saat Grafik</th>`,
    `<th style="padding:8px 10px;text-align:right;font-weight:700;">Saat</th>
                <th style="padding:8px 10px;text-align:right;font-weight:700;">Fazla Mesai</th>
                <th style="padding:8px 10px;text-align:right;font-weight:700;">Saat Grafik</th>`
  );
  rep(
    `<td style="padding:10px;text-align:right;font-weight:700;color:\${color};">\${s.totalH.toFixed(1)}s</td>
            <td style="padding:10px;min-width:100px;">`,
    `<td style="padding:10px;text-align:right;font-weight:700;color:\${color};">\${s.totalH.toFixed(1)}s</td>
            <td style="padding:10px;text-align:right;font-weight:700;color:\${s.totalOvertimeH > 0 ? "#4ade80" : "var(--text3)"};">\${s.totalOvertimeH > 0 ? "+" + s.totalOvertimeH.toFixed(1) + "s" : "—"}</td>
            <td style="padding:10px;min-width:100px;">`
  );
  rep(
    `        const grossTotal = earn + ekTotal;
        return { w, totalH, workedDays, earn, ekTotal, advTotal, grossTotal, net: grossTotal - advTotal };
      }).sort((a, b) => b.totalH - a.totalH);`,
    `        const grossTotal = earn + ekTotal;
        const totalOvertimeH = calcMonthOvertimeHours(w.id, year, month);
        return { w, totalH, workedDays, totalOvertimeH, earn, ekTotal, advTotal, grossTotal, net: grossTotal - advTotal };
      }).sort((a, b) => b.totalH - a.totalH);`
  );
  rep(
    `<td style="padding:10px;text-align:right;color:var(--accent);">\${totalH.toFixed(1)}s</td>
          <td></td>
          <td style="padding:10px;text-align:right;color:var(--text);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>`,
    `<td style="padding:10px;text-align:right;color:var(--accent);">\${totalH.toFixed(1)}s</td>
          <td style="padding:10px;text-align:right;color:#4ade80;">\${stats.reduce((a,s)=>a+s.totalOvertimeH,0).toFixed(1)}s</td>
          <td></td>
          <td style="padding:10px;text-align:right;color:var(--text);">\${cur}\${totalGrossAll.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>`
  );
}

// --- PDF overtime ---
if (!h.includes('scard("Fazla Mesai"')) {
  rep(
    `      data.forEach(({ w, dayRows, totalH, earn, ekTotal, advTotal, grossTotal, net, advList }) => {`,
    `      data.forEach(({ w, dayRows, totalH, totalOvertimeH, earn, ekTotal, advTotal, grossTotal, net, advList }) => {`
  );
  rep(
    `              \${scard("Toplam Saat", fmtH(totalH)+"s", GRAY1)}
              \${scard("Toplam Kazanç", fmt(grossTotal), BLUE)}`,
    `              \${scard("Toplam Saat", fmtH(totalH)+"s", GRAY1)}
              \${totalOvertimeH > 0 ? scard("Fazla Mesai", "+"+fmtH(totalOvertimeH)+"s", "#0F766E") : ""}
              \${scard("Toplam Kazanç", fmt(grossTotal), BLUE)}`
  );
  rep(
    `                <td colspan="2" style="padding:6px 8px;font-size:9px;font-weight:700;color:\${GRAY3};text-transform:uppercase;letter-spacing:.5px;">Toplam</td>
                <td style="padding:6px 8px;text-align:right;font-size:13px;font-weight:900;color:\${GRAY1};">\${fmtH(totalH)}<span style="font-size:9px;color:\${GRAY4};margin-left:2px;">s</span></td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:\${BLUE};">\${fmt(earn)}</td>
                <td></td>`,
    `                <td colspan="2" style="padding:6px 8px;font-size:9px;font-weight:700;color:\${GRAY3};text-transform:uppercase;letter-spacing:.5px;">Toplam</td>
                <td style="padding:6px 8px;text-align:right;font-size:13px;font-weight:900;color:\${GRAY1};">\${fmtH(totalH)}<span style="font-size:9px;color:\${GRAY4};margin-left:2px;">s</span></td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:#0F766E;">\${totalOvertimeH > 0 ? "+"+fmtH(totalOvertimeH)+"s" : "—"}</td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;color:\${BLUE};">\${fmt(earn)}</td>
                <td></td>`
  );
  rep(
    `      const summaryRows = data.map(({w,totalH,grossTotal,advTotal,net},i) =>`,
    `      const summaryRows = data.map(({w,totalH,totalOvertimeH,grossTotal,advTotal,net},i) =>`
  );
  rep(
    `<th style="padding:9px 16px;text-align:right;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">Saat</th>
                <th style="padding:9px 16px;text-align:right;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">Toplam kazanç</th>`,
    `<th style="padding:9px 16px;text-align:right;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">Saat</th>
                <th style="padding:9px 16px;text-align:right;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">Fazla mesai</th>
                <th style="padding:9px 16px;text-align:right;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:\${GRAY4};">Toplam kazanç</th>`
  );
  rep(
    `          <td style="padding:9px 16px;border-bottom:1px solid \${BORDER};text-align:right;font-weight:700;color:\${GRAY2};font-variant-numeric:tabular-nums;">\${fmtH(totalH)}s</td>
          <td style="padding:9px 16px;border-bottom:1px solid \${BORDER};text-align:right;font-weight:700;color:\${BLUE};font-variant-numeric:tabular-nums;">\${fmt(grossTotal)}</td>`,
    `          <td style="padding:9px 16px;border-bottom:1px solid \${BORDER};text-align:right;font-weight:700;color:\${GRAY2};font-variant-numeric:tabular-nums;">\${fmtH(totalH)}s</td>
          <td style="padding:9px 16px;border-bottom:1px solid \${BORDER};text-align:right;font-weight:700;color:#0F766E;font-variant-numeric:tabular-nums;">\${totalOvertimeH > 0 ? "+"+fmtH(totalOvertimeH)+"s" : "—"}</td>
          <td style="padding:9px 16px;border-bottom:1px solid \${BORDER};text-align:right;font-weight:700;color:\${BLUE};font-variant-numeric:tabular-nums;">\${fmt(grossTotal)}</td>`
  );
  rep(
    `<td style="padding:11px 16px;text-align:right;font-weight:700;color:#94A3B8;">\${fmtH(totalHrs)}s</td>
                <td style="padding:11px 16px;text-align:right;font-weight:800;color:#93C5FD;">\${fmt(totalGross)}</td>`,
    `<td style="padding:11px 16px;text-align:right;font-weight:700;color:#94A3B8;">\${fmtH(totalHrs)}s</td>
                <td style="padding:11px 16px;text-align:right;font-weight:700;color:#6EE7B7;">\${data.reduce((a,d)=>a+(d.totalOvertimeH||0),0) > 0 ? "+"+fmtH(data.reduce((a,d)=>a+(d.totalOvertimeH||0),0))+"s" : "—"}</td>
                <td style="padding:11px 16px;text-align:right;font-weight:800;color:#93C5FD;">\${fmt(totalGross)}</td>`
  );
}

// CSV
if (!h.includes("Fazla mesai;;;")) {
  rep(
    `      data.forEach(({ w, dayRows, totalH, earn, ekTotal, advTotal, grossTotal, net }) => {`,
    `      data.forEach(({ w, dayRows, totalH, totalOvertimeH, earn, ekTotal, advTotal, grossTotal, net }) => {`
  );
  rep(
    "        csv += `Toplam;;;${totalH.toFixed(2)};;;\\n`;",
    "        csv += `Toplam;;;${totalH.toFixed(2)};;;\\n`;\n        csv += `Fazla mesai;;;${(totalOvertimeH||0).toFixed(2)};;;\\n`;"
  );
  rep(
    `      csv += \`ÖZET\\nÇalışan;Toplam Saat;Saat kazancı;Ek kazanç;Toplam kazanç;Avans;Net\\n\`;`,
    `      csv += \`ÖZET\\nÇalışan;Toplam Saat;Fazla mesai;Saat kazancı;Ek kazanç;Toplam kazanç;Avans;Net\\n\`;`
  );
  rep(
    `        csv += \`\${w.name};\${totalH.toFixed(2)};\${earn.toFixed(2)};\${ekTotal.toFixed(2)};\${grossTotal.toFixed(2)};\${advTotal.toFixed(2)};\${net.toFixed(2)}\\n\`;`,
    `        csv += \`\${w.name};\${totalH.toFixed(2)};\${(totalOvertimeH||0).toFixed(2)};\${earn.toFixed(2)};\${ekTotal.toFixed(2)};\${grossTotal.toFixed(2)};\${advTotal.toFixed(2)};\${net.toFixed(2)}\\n\`;`
  );
}

// QR
if (!h.includes("_qrWebStreamPrepared")) {
  rep(
    `    let qrScanStream = null;
    let qrScanInterval = null;`,
    `    let qrScanStream = null;
    let qrScanInterval = null;
    let _qrWebStreamPrepared = null;
    let _qrNativePermGranted = false;`
  );
  rep(
    `    function primeCameraOnFirstQrVisit() {
      try {
        if (isCapacitorNative()) return;
        if (localStorage.getItem("ct_qr_cam_primed_v1")) return;
        if (!navigator.mediaDevices?.getUserMedia) return;
        localStorage.setItem("ct_qr_cam_primed_v1", "1");
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
          .then(s => s.getTracks().forEach(t => t.stop()))
          .catch(() => {});
      } catch (e) {}
    }`,
    `    async function prepareNativeQrCamera() {
      const pack = ctCapPlugins();
      if (!pack?.BarcodeScanner || !isCapacitorNative()) return;
      try {
        const perm = await pack.BarcodeScanner.checkPermission({ force: false });
        if (perm?.granted === true || perm?.denied === false) _qrNativePermGranted = true;
      } catch (e) {}
    }
    async function prepareQrWebCamera() {
      if (isCapacitorNative() || !navigator.mediaDevices?.getUserMedia) return;
      if (_qrWebStreamPrepared || qrScanStream) return;
      try {
        _qrWebStreamPrepared = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch (e) {}
    }
    function primeCameraOnFirstQrVisit() {
      void prepareQrWebCamera();
    }`
  );
  rep(
    `      document.getElementById("calisan-nav").style.display = isPatron ? "none" : "";
      const navDash = document.getElementById("nav-dashboard");`,
    `      document.getElementById("calisan-nav").style.display = isPatron ? "none" : "";
      if (!isPatron && !isPlatformAdmin) { void prepareNativeQrCamera(); void prepareQrWebCamera(); }
      const navDash = document.getElementById("nav-dashboard");`
  );
  rep(
    `          await initNativeCapacitorShell();
          const perm = await pack.BarcodeScanner.checkPermission({ force: true });
          if (perm?.denied === true) {`,
    `          await initNativeCapacitorShell();
          const perm = await pack.BarcodeScanner.checkPermission({ force: !_qrNativePermGranted });
          if (perm?.granted === true || perm?.denied === false) _qrNativePermGranted = true;
          if (perm?.denied === true) {`
  );
  rep(
    `          /* Native eklenti startScan içinde hideBackground + kamera kurar; ayrı prepare/hideBackground yarışa yol açıp gri ekran bırakabiliyor. */
          await new Promise(r => setTimeout(r, 280));
          let result;`,
    `          let result;`
  );
  rep(
    `      try {
        const tryStream = async (constraints) => navigator.mediaDevices.getUserMedia(constraints);
        try {
          qrScanStream = await tryStream({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        } catch (e1) {
          try {
            qrScanStream = await tryStream({ video: { facingMode: "environment" } });
          } catch (e2) {
            qrScanStream = await tryStream({ video: true });
          }
        }
        vid.srcObject = qrScanStream;
        await vid.play();`,
    `      try {
        if (_qrWebStreamPrepared) {
          qrScanStream = _qrWebStreamPrepared;
          _qrWebStreamPrepared = null;
        } else {
          const tryStream = async (constraints) => navigator.mediaDevices.getUserMedia(constraints);
          try {
            qrScanStream = await tryStream({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
          } catch (e1) {
            try {
              qrScanStream = await tryStream({ video: { facingMode: "environment" } });
            } catch (e2) {
              qrScanStream = await tryStream({ video: true });
            }
          }
        }
        vid.srcObject = qrScanStream;
        await vid.play();`
  );
  rep(
    `      if (!isPatron) {
        primeCameraOnFirstQrVisit();
      }`,
    `      if (!isPatron) {
        primeCameraOnFirstQrVisit();
        if (isCapacitorNative()) void prepareNativeQrCamera();
      }`
  );
  rep(
    `        if (vid.readyState === vid.HAVE_ENOUGH_DATA) {
          const vw = vid.videoWidth, vh = vid.videoHeight;
          const maxW = 640;`,
    `        if (vid.readyState >= vid.HAVE_CURRENT_DATA && vid.videoWidth > 0) {
          const vw = vid.videoWidth, vh = vid.videoHeight;
          const maxW = 480;`
  );
}

fs.writeFileSync(p, h);
console.log("done", h.includes("clearWorkerNotifications"), h.includes("Fazla Mesai"), h.includes("_qrWebStreamPrepared"));
