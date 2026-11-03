const fs = require("fs");
const path = require("path");
const indexPath = path.join(__dirname, "..", "public", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

function mustReplace(oldStr, newStr, label) {
  if (!html.includes(oldStr)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  html = html.replace(oldStr, newStr);
}

mustReplace(
  `              <div class="field">
                <label>Ad Soyad</label>
                <input type="text" id="setting-name" placeholder="Ad Soyad"/>
              </div>
              <div class="field"><label>Kullanıcı Adı</label><input type="text" id="setting-username" placeholder="kullanici_adi"/></div>`,
  `              <div class="field">
                <label>Ad Soyad</label>
                <input type="text" id="setting-name" placeholder="Ad Soyad"/>
              </div>
              <div class="field" id="setting-password-wrap" style="display:none;">
                <label>Şifre</label>
                <input type="text" id="setting-password-display" readonly autocomplete="off" style="font-family:var(--font-mono,monospace);letter-spacing:0.04em;"/>
                <div style="font-size:10px;color:var(--text3);margin-top:6px;line-height:1.4;">Giriş şifreniz. Değiştirmek için aşağıdaki «Şifre Değiştir» bölümünü kullanın.</div>
              </div>
              <div class="field"><label>Kullanıcı Adı</label><input type="text" id="setting-username" placeholder="kullanici_adi"/></div>`,
  "settings password field"
);

mustReplace(
  `    function paFormatUserRow(u) {
      const bits = [];
      bits.push("@" + escHtml(String(u.username || "—")));
      if ((u.name || "").trim()) bits.push(escHtml(u.name.trim()));
      bits.push("rol: " + escHtml(String(u.role || "—")));
      if ((u.phone || "").trim()) bits.push("tel: " + escHtml(u.phone.trim()));
      if ((u.jobTitle || "").trim()) bits.push(escHtml(u.jobTitle.trim()));
      if ((u.address || "").trim()) bits.push(escHtml(String(u.address).trim().slice(0, 80)) + (String(u.address).length > 80 ? "…" : ""));
      const hr = Number(u.hourlyRate);
      if (Number.isFinite(hr) && hr > 0) bits.push(hr + "/s");
      bits.push("id: " + escHtml(String(u.id || "")));
      return bits.join(" · ");
    }`,
  `    function formatPasswordForDisplay(pw) {
      const p = String(pw ?? "");
      return p ? escHtml(p) : "—";
    }
    function paFormatUserRow(u) {
      const bits = [];
      bits.push("@" + escHtml(String(u.username || "—")));
      if ((u.name || "").trim()) bits.push(escHtml(u.name.trim()));
      bits.push("rol: " + escHtml(String(u.role || "—")));
      bits.push('şifre: <code style="font-size:11px;">' + formatPasswordForDisplay(u.password) + '</code>');
      if ((u.phone || "").trim()) bits.push("tel: " + escHtml(u.phone.trim()));
      if ((u.jobTitle || "").trim()) bits.push(escHtml(u.jobTitle.trim()));
      if ((u.address || "").trim()) bits.push(escHtml(String(u.address).trim().slice(0, 80)) + (String(u.address).length > 80 ? "…" : ""));
      const hr = Number(u.hourlyRate);
      if (Number.isFinite(hr) && hr > 0) bits.push(hr + "/s");
      bits.push("id: " + escHtml(String(u.id || "")));
      return bits.join(" · ");
    }`,
  "paFormatUserRow password"
);

mustReplace(
  `    function getPastWorkers() {
      return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId && u.terminatedAt);
    }`,
  `    function getPastWorkers() {
      return DB.users.filter(u => u.role === "calisan" && u.companyId === currentUser.companyId && u.terminatedAt);
    }
    function getCompanyPatrons() {
      return DB.users.filter(u => u.role === "patron" && u.companyId === currentUser.companyId);
    }`,
  "getCompanyPatrons"
);

mustReplace(
  `        const extraInfo = [
          w.phone ? \`📞 \${escHtml(w.phone)}\` : null,
          w.address ? \`📍 \${escHtml(w.address)}\` : null,
        ].filter(Boolean).join(" · ");`,
  `        const extraInfo = [
          w.phone ? \`📞 \${escHtml(w.phone)}\` : null,
          w.address ? \`📍 \${escHtml(w.address)}\` : null,
          \`🔑 Şifre: <code style="font-size:11px;">\${formatPasswordForDisplay(w.password)}</code>\`,
        ].filter(Boolean).join(" · ");`,
  "empRow password"
);

mustReplace(
  `      if (!workers.length) {
        document.getElementById("emp-list").innerHTML = \`<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">Aktif personel yok.<br>Sağ üstten personel ekleyin.</div></div>\`;
      } else {
        document.getElementById("emp-list").innerHTML = workers.map(w => empRow(w, false)).join("");
      }`,
  `      const patrons = getCompanyPatrons();
      let listHtml = "";
      if (patrons.length) {
        listHtml += \`<div style="font-size:11px;font-weight:800;color:var(--text3);margin:0 0 8px;">Patron hesapları</div>\`
          + patrons.map(p => {
            const bg = p.color || "#f5a623";
            const initials = (p.name || "P").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
            return \`<div class="emp-row" style="margin-bottom:8px;">
              <div class="emp-avatar" style="background:\${bg}22;color:\${bg};border:1px solid \${bg}44;">\${initials}</div>
              <div class="emp-info">
                <div class="emp-name">\${escHtml(p.name)} <span style="font-size:10px;color:var(--accent);">Patron</span></div>
                <div class="emp-meta">@\${escHtml(p.username)} · 🔑 Şifre: <code style="font-size:11px;">\${formatPasswordForDisplay(p.password)}</code></div>
              </div>
            </div>\`;
          }).join("")
          + (workers.length ? '<div style="font-size:11px;font-weight:800;color:var(--text3);margin:14px 0 8px;">Çalışanlar</div>' : "");
      }
      if (!workers.length) {
        listHtml += patrons.length
          ? ""
          : \`<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">Aktif personel yok.<br>Sağ üstten personel ekleyin.</div></div>\`;
      } else {
        listHtml += workers.map(w => empRow(w, false)).join("");
      }
      document.getElementById("emp-list").innerHTML = listHtml;`,
  "emp list patrons"
);

mustReplace(
  `    <div class="field"><label>Şifre</label><input type="password" id="emp-pass" placeholder="En az 4 karakter"/></div>`,
  `    <div class="field"><label>Şifre</label><input type="text" id="emp-pass" placeholder="En az 4 karakter" autocomplete="off"/></div>`,
  "add emp pass text"
);

mustReplace(
  `    <div class="field"><label>Yeni Şifre (boş bırakırsan değişmez)</label><input type="password" id="emp-pass" placeholder="Değiştirmek için yaz..."/></div>`,
  '    <div class="field"><label>Şifre</label><input type="text" id="emp-pass" value="${escHtml(w.password || "")}" placeholder="En az 4 karakter" autocomplete="off"/></div>',
  "edit emp pass text"
);

mustReplace(
  `        const updated = { ...w, name, jobTitle, username: uname, hourlyRate: rate, phone, address, weeklyOff, color, hiddenMenuIds, annualLeaveDays, hideTodayEarn: !!document.getElementById("emp-hide-today-earn")?.checked, ...(pass && pass.length >= 4 ? { password: pass } : {}) };`,
  `        if (!pass || pass.length < 4) { showToast("Şifre en az 4 karakter", "warn"); return false; }
        const updated = { ...w, name, jobTitle, username: uname, password: pass, hourlyRate: rate, phone, address, weeklyOff, color, hiddenMenuIds, annualLeaveDays, hideTodayEarn: !!document.getElementById("emp-hide-today-earn")?.checked };`,
  "edit save password required"
);

mustReplace(
  `      const nameInp = document.getElementById("setting-name");
      const profileSaveBtn = document.getElementById("setting-profile-save-btn");
      if (unameEl) unameEl.value = currentUser.username || "";
      if (phoneEl) phoneEl.value = formatTrPhoneDisplay(currentUser.phone || "");
      if (nameInp) nameInp.value = currentUser.name || "";
      syncTrHolidaysDiyanetLink();
      applyUiThemePrefs();

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler
      if (!isPatron) {`,
  `      const nameInp = document.getElementById("setting-name");
      const profileSaveBtn = document.getElementById("setting-profile-save-btn");
      const passWrap = document.getElementById("setting-password-wrap");
      const passDisp = document.getElementById("setting-password-display");
      if (unameEl) unameEl.value = currentUser.username || "";
      if (phoneEl) phoneEl.value = formatTrPhoneDisplay(currentUser.phone || "");
      if (nameInp) nameInp.value = currentUser.name || "";
      if (passWrap && passDisp) {
        passWrap.style.display = "";
        passDisp.value = currentUser.password || "";
      }
      syncTrHolidaysDiyanetLink();
      applyUiThemePrefs();

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler
      if (!isPatron) {`,
  "loadSettings password display"
);

mustReplace(
  `      currentUser = DB.users[idx];
      const navName = document.getElementById("nav-username");
      if (navName) navName.textContent = name;
      const dbName = document.getElementById("db-name");
      if (dbName && currentUser.role === "patron") {
        dbName.textContent = "Sayın " + name + ", Hoş Geldiniz!";
      }
      localCacheSave();`,
  `      currentUser = DB.users[idx];
      const navName = document.getElementById("nav-username");
      if (navName) navName.textContent = name;
      const dbName = document.getElementById("db-name");
      if (dbName && currentUser.role === "patron") {
        dbName.textContent = "Sayın " + name + ", Hoş Geldiniz!";
      }
      const passDisp = document.getElementById("setting-password-display");
      if (passDisp) passDisp.value = currentUser.password || "";
      localCacheSave();`,
  "saveProfile update pass display"
);

mustReplace(
  `      currentUser = DB.users[idx];
      localCacheSave();
      saveUser(currentUser.id);
      document.getElementById("setting-oldpass").value = "";
      document.getElementById("setting-newpass").value = "";
      document.getElementById("setting-newpass2").value = "";
      showToast("Şifre güncellendi ✓");`,
  `      currentUser = DB.users[idx];
      const passDisp = document.getElementById("setting-password-display");
      if (passDisp) passDisp.value = np;
      localCacheSave();
      saveUser(currentUser.id);
      document.getElementById("setting-oldpass").value = "";
      document.getElementById("setting-newpass").value = "";
      document.getElementById("setting-newpass2").value = "";
      showToast("Şifre güncellendi ✓");`,
  "savePassword update display"
);

fs.writeFileSync(indexPath, html, "utf8");
console.log("OK", indexPath);
