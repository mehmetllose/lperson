const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(file, "utf8");

const themeCard = `            <!-- Görünüm -->
            <div class="card" id="ui-theme-settings-card">
              <div class="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                Görünüm
              </div>
              <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5;">Tema, parlaklık ve vurgu rengini kişiselleştirin.</div>
              <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
                <button type="button" class="btn btn-sm" id="ui-theme-dark-btn" onclick="setUiThemeMode('dark')">Koyu</button>
                <button type="button" class="btn btn-sm" id="ui-theme-light-btn" onclick="setUiThemeMode('light')">Açık</button>
              </div>
              <div class="field" style="margin-bottom:12px;">
                <label>Parlaklık <span id="ui-brightness-val" style="color:var(--accent);font-weight:700;">100%</span></label>
                <input type="range" id="ui-brightness-range" min="0.75" max="1.25" step="0.01" value="1" style="width:100%;accent-color:var(--accent);" oninput="onUiBrightnessInput(this.value)"/>
              </div>
              <div class="field" style="margin-bottom:4px;">
                <label>Tema rengi (vurgu)</label>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <input type="color" id="ui-accent-color" value="#f5a623" style="width:48px;height:36px;padding:2px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);cursor:pointer;" oninput="onUiAccentInput(this.value)"/>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="resetUiAccentColor()">Varsayılana dön</button>
                </div>
              </div>
            </div>

`.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</motion.div>");

const themeJs = `    const UI_PREFS_KEY = "ct_ui_prefs";
    function loadUiPrefs() {
      try {
        const raw = localStorage.getItem(UI_PREFS_KEY);
        if (!raw) return { theme: "dark", brightness: 1, accent: "" };
        const p = JSON.parse(raw);
        return {
          theme: p.theme === "light" ? "light" : "dark",
          brightness: Math.min(1.25, Math.max(0.75, Number(p.brightness) || 1)),
          accent: String(p.accent || "").trim(),
        };
      } catch (e) {
        return { theme: "dark", brightness: 1, accent: "" };
      }
    }
    function saveUiPrefs(p) {
      try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(p)); } catch (e) {}
    }
    function hexToRgb(hex) {
      const hx = String(hex || "").replace("#", "");
      if (hx.length !== 6) return null;
      return { r: parseInt(hx.slice(0, 2), 16), g: parseInt(hx.slice(2, 4), 16), b: parseInt(hx.slice(4, 6), 16) };
    }
    function shadeHex(hex, pct) {
      const c = hexToRgb(hex);
      if (!c) return hex;
      const f = (n) => Math.max(0, Math.min(255, Math.round(n + (pct < 0 ? n * pct : (255 - n) * pct))));
      const to = n => n.toString(16).padStart(2, "0");
      return "#" + to(f(c.r)) + to(f(c.g)) + to(f(c.b));
    }
    function applyUiThemePrefs() {
      const p = loadUiPrefs();
      const root = document.documentElement;
      root.setAttribute("data-theme", p.theme === "light" ? "light" : "dark");
      root.style.setProperty("--ui-brightness", String(p.brightness));
      const defAccent = "#f5a623";
      const accent = p.accent && /^#[0-9a-fA-F]{6}$/.test(p.accent) ? p.accent : defAccent;
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent2", shadeHex(accent, -0.12));
      const br = document.getElementById("ui-brightness-range");
      const bv = document.getElementById("ui-brightness-val");
      const ac = document.getElementById("ui-accent-color");
      const darkBtn = document.getElementById("ui-theme-dark-btn");
      const lightBtn = document.getElementById("ui-theme-light-btn");
      if (br) br.value = String(p.brightness);
      if (bv) bv.textContent = Math.round(p.brightness * 100) + "%";
      if (ac) ac.value = accent;
      if (darkBtn) darkBtn.className = "btn btn-sm " + (p.theme === "dark" ? "btn-primary" : "btn-secondary");
      if (lightBtn) lightBtn.className = "btn btn-sm " + (p.theme === "light" ? "btn-primary" : "btn-secondary");
    }
    function setUiThemeMode(mode) {
      const p = loadUiPrefs();
      p.theme = mode === "light" ? "light" : "dark";
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function onUiBrightnessInput(val) {
      const p = loadUiPrefs();
      p.brightness = Math.min(1.25, Math.max(0.75, Number(val) || 1));
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function onUiAccentInput(val) {
      const p = loadUiPrefs();
      p.accent = String(val || "").trim();
      saveUiPrefs(p);
      applyUiThemePrefs();
    }
    function resetUiAccentColor() {
      const p = loadUiPrefs();
      p.accent = "";
      saveUiPrefs(p);
      applyUiThemePrefs();
    }

`;

if (!h.includes("ui-theme-settings-card")) {
  const anchor = `            <!-- Şifre Değiştir -->
            <div class="card">
              <div class="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Şifre Değiştir
              </div>`;
  if (!h.includes(anchor)) throw new Error("anchor missing");
  h = h.replace(anchor, themeCard + anchor);
  console.log("card ok");
}

if (!h.includes("function loadUiPrefs")) {
  h = h.replace(
    "    function loadSettingsPage() {\n      if (currentUser?.role === \"platformAdmin\") return;",
    themeJs + "    function loadSettingsPage() {\n      if (currentUser?.role === \"platformAdmin\") return;"
  );
  console.log("js ok");
}

if (!h.includes("applyUiThemePrefs();\n\n      // Çalışan")) {
  h = h.replace(
    `      document.getElementById("setting-phone").value = currentUser.phone || "";

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler`,
    `      document.getElementById("setting-phone").value = currentUser.phone || "";
      applyUiThemePrefs();

      // Çalışan: profil/şifre + ana ekran kartları + bildirimler`
  );
  console.log("settings ok");
}

if (!h.includes("tr-holidays-year-span")) {
  h = h.replace(
    "      renderTurkeyHolidaysRefTable();\n      renderNativePushSettings();\n      syncQrGeoPatronUI();",
    "      renderTurkeyHolidaysRefTable();\n      const holSpan = document.getElementById(\"tr-holidays-year-span\");\n      if (holSpan) holSpan.textContent = getTrReferenceHolidayYears().join(\", \");\n      renderNativePushSettings();\n      syncQrGeoPatronUI();"
  );
  console.log("hol ok");
}

if (!h.includes("applyUiThemePrefs();\n      void migrateHideWorkerTodayEarnToPerUser")) {
  h = h.replace(
    "    function launchApp() {\n      void migrateHideWorkerTodayEarnToPerUser();",
    "    function launchApp() {\n      applyUiThemePrefs();\n      void migrateHideWorkerTodayEarnToPerUser();"
  );
  console.log("launch ok");
}

if (!h.includes("applyUiThemePrefs();\n    tryAutoLogin")) {
  h = h.replace(
    "    tryAutoLogin();\n    window.doLogin = doLogin;",
    "    applyUiThemePrefs();\n    tryAutoLogin();\n    window.doLogin = doLogin;"
  );
  console.log("boot ok");
}

fs.writeFileSync(file, h);
console.log("done");
