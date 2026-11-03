import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "public", "index.html");
let s = fs.readFileSync(indexPath, "utf8");

const beachDecoInner = `        <div class="beach-wave-layer beach-wave-layer--top beach-wave-layer--t1"></div>
        <div class="beach-wave-layer beach-wave-layer--top beach-wave-layer--t2"></div>
        <div class="beach-wave-layer beach-wave-layer--bottom beach-wave-layer--b1"></div>
        <div class="beach-wave-layer beach-wave-layer--bottom beach-wave-layer--b2"></div>
        <div class="beach-wave-layer beach-wave-layer--bottom beach-wave-layer--b3"></div>`;

s = s.replace(
  /<div class="ocean-theme-deco ocean-(?:app|dash)-deco" aria-hidden="true">[\s\S]*?<\/div>/g,
  (m) => {
    const cls = m.includes("ocean-app-deco") ? "beach-app-deco" : "beach-dash-deco";
    const indent = m.startsWith("    <div") ? "    " : "              ";
    return (
      indent +
      '<div class="beach-theme-deco ' +
      cls +
      '" aria-hidden="true">\n' +
      beachDecoInner +
      "\n" +
      indent +
      "</div>"
    );
  }
);

const renamePairs = [
  ["dash-theme-ocean", "dash-theme-beach"],
  ["dash-active-theme-ocean", "dash-active-theme-beach"],
  ["ocean-bubbles-on", "beach-waves-on"],
  ["ocean-app-bubbles-on", "beach-app-waves-on"],
  ["ocean-mobile-ctx", "beach-mobile-ctx"],
  ["ocean-theme-deco", "beach-theme-deco"],
  ["ocean-dash-deco", "beach-dash-deco"],
  ["ocean-app-deco", "beach-app-deco"],
  ['{ id: "ocean", label: "Okyanus", emoji: "🫧" }', '{ id: "beach", label: "Sahil", emoji: "🏖️" }'],
  ["shouldOceanPerfLite", "shouldBeachPerfLite"],
  ["syncOceanThemeOptions", "syncBeachThemeOptions"],
  ["buildOceanBubblesToggleHtml", "buildBeachWavesToggleHtml"],
  ["ownerFunSyncOceanBubblesRow", "ownerFunSyncBeachWavesRow"],
  ["ownerFunToggleOceanBubbles", "ownerFunToggleBeachWaves"],
  ["ofun-ocean-bubbles-row", "ofun-beach-waves-row"],
  ["ofun-ocean-bubbles-sw", "ofun-beach-waves-sw"],
  ["_oceanCtxResizeBound", "_beachCtxResizeBound"],
  ["_oceanCtxResizeT", "_beachCtxResizeT"],
  ['if (p.dashTheme === "neon") p.dashTheme = "ocean";', 'if (p.dashTheme === "neon" || p.dashTheme === "ocean") p.dashTheme = "beach";'],
  ['if (id === "neon") id = "ocean";', 'if (id === "neon" || id === "ocean") id = "beach";'],
  ["/* Okyanus:", "/* Sahil:"],
  ["okyanus /", "sahil /"],
];
for (const [a, b] of renamePairs) s = s.split(a).join(b);

s = s.replace(/oceanBubbles/g, (m, off) => {
  const before = s.slice(Math.max(0, off - 80), off);
  if (before.includes("typeof p.oceanBubbles") || before.includes("p.oceanBubbles")) return "beachWaves";
  return m;
});

// Fix loadOwnerFunPrefs - handle beachWaves migration
s = s.replace(
  /oceanBubbles: null/g,
  "beachWaves: null"
);
s = s.replace(
  /if \(typeof p\.beachWaves !== "boolean"\) p\.beachWaves = !shouldBeachPerfLite\(\);/,
  `if (typeof p.beachWaves !== "boolean") {
            if (typeof p.oceanBubbles === "boolean") p.beachWaves = p.oceanBubbles;
            else p.beachWaves = true;
          }`
);
s = s.replace(/d\.beachWaves = !shouldBeachPerfLite\(\);/, "d.beachWaves = true;");

// Theme id checks
s = s.split('id === "ocean"').join('id === "beach"');
s = s.split('themeId !== "ocean"').join('themeId !== "beach"');
s = s.split('id !== "ocean"').join('id !== "beach"');
s = s.split('=== "ocean"').join('=== "beach"');

// UI strings
s = s.split("Okyanus baloncukları").join("Sahil dalgaları");
s = s.split("Önce Okyanus temasını seçin").join("Önce Sahil temasını seçin");
s = s.split("Okyanus baloncukları açıldı 🫧").join("Sahil dalgaları açıldı 🌊");
s = s.split("Yüzen baloncuk efektini aç/kapat.").join("Kıyıdan ve gökyüzünden gelen dalga efektini aç/kapat.");
s = s.split("Telefonda en fazla 5 baloncuk (hafif animasyon). Kasma olursa kapatın.").join("Telefonda hafif dalga animasyonu. Kasma olursa kapatın.");
s = s.replace(/🫧 Sahil/g, "🌊 Sahil");

// Keyframes
const oldKeyframes = /    @keyframes dash-ocean-current \{[\s\S]*?    @keyframes dash-ocean-light-ray \{[\s\S]*?    \}/;
const newKeyframes = `    @keyframes dash-beach-wave-drift {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes dash-beach-wave-drift-rev {
      0% { transform: rotate(180deg) translateX(0); }
      100% { transform: rotate(180deg) translateX(-50%); }
    }
    @keyframes dash-beach-shimmer {
      0%, 100% { opacity: 0.42; }
      50% { opacity: 0.68; }
    }
    @keyframes dash-beach-surf {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }`;
s = s.replace(oldKeyframes, newKeyframes);

// Remove bubble portal JS
s = s.replace(
  /\s*const OCEAN_BUBBLE_PORTAL_ID[\s\S]*?function ensureOceanBubblePortal\(themeId, prefs\) \{[\s\S]*?\}\n/,
  "\n"
);
s = s.replace(/removeOceanBubblePortal\(\);\n\s*/g, "");
s = s.replace(/\s*ensureOceanBubblePortal\(id, p\);\n/, "\n");

// syncBeachThemeOptions body fix
s = s.replace(/const bubblesOn = !!p\.beachWaves;/, "const wavesOn = !!p.beachWaves;");
s = s.replace(/if \(bubblesOn\)/g, "if (wavesOn)");
s = s.replace(/root\.classList\.toggle\("beach-waves-on", bubblesOn\)/, 'root.classList.toggle("beach-waves-on", wavesOn)');
s = s.replace(/if \(wavesOn\) app\.classList\.add\("beach-app-waves-on"\)/, 'if (wavesOn) app.classList.add("beach-app-waves-on")');

s = s.replace(
  /if \(id === "beach" && typeof p\.beachWaves !== "boolean"\) p\.beachWaves = !shouldBeachPerfLite\(\);/,
  'if (id === "beach" && typeof p.beachWaves !== "boolean") p.beachWaves = true;'
);
s = s.replace(
  /\} else if \(typeof p\.beachWaves !== "boolean"\) \{\n\s*p\.beachWaves = !shouldBeachPerfLite\(\);/,
  '} else if (typeof p.beachWaves !== "boolean") {\n        p.beachWaves = true;'
);

s = s.replace(
  /if \(p\.beachWaves && shouldBeachPerfLite\(\)\) showToast/,
  "if (p.beachWaves) showToast"
);
s = s.replace(
  /if \(!p\.beachWaves \|\| !shouldBeachPerfLite\(\)\) ownerFunRestartDashAnimations\(\);/,
  "if (!p.beachWaves) ownerFunRestartDashAnimations();"
);

// Replace theme CSS block
const cssStart = s.indexOf("  /* Sahil: derin su");
const cssEnd = s.indexOf("  /* Ejderha: kızıl-altın");
if (cssStart >= 0 && cssEnd > cssStart) {
  const beachCss = fs.readFileSync(path.join(root, "scripts", "beach-theme-block.css"), "utf8");
  s = s.slice(0, cssStart) + beachCss + "\n" + s.slice(cssEnd);
}

// App-wide beach background
const oldAppWide = /#app-screen\.dash-theme-app-wide\.dash-theme-beach \{[\s\S]*?html\.ct-light #app-screen\.dash-theme-app-wide\.dash-theme-beach \.main-header \{[\s\S]*?\}\n/;
const newAppWide = `#app-screen.dash-theme-app-wide.dash-theme-beach {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 85% 40% at 50% 0%, rgba(125, 211, 252, 0.28) 0%, transparent 55%),
      linear-gradient(180deg, #6eb8d9 0%, #38bdf8 22%, #0891b2 42%, #0e7490 52%, #d4b896 52%, #e8d5b5 72%, #f0e6d2 100%);
  }
  #app-screen.dash-theme-app-wide.dash-theme-beach .app-layout {
    position: relative;
    z-index: 1;
  }
  #app-screen.dash-theme-app-wide.dash-theme-beach .nav-sidebar,
  #app-screen.dash-theme-app-wide.dash-theme-beach .top-bar,
  #app-screen.dash-theme-app-wide.dash-theme-beach .main-header {
    background: linear-gradient(180deg, rgba(8, 116, 144, 0.94), rgba(180, 140, 90, 0.42));
    border-color: rgba(212, 184, 150, 0.32);
    box-shadow: inset 0 -1px 0 rgba(254, 243, 199, 0.12);
  }
  #app-screen.dash-theme-app-wide.dash-theme-beach .nav-item.active {
    background: rgba(56, 189, 248, 0.16);
    color: #fef9e7;
    box-shadow: inset 0 0 0 1px rgba(212, 184, 150, 0.28), 0 0 12px rgba(56, 189, 248, 0.1);
  }
  #app-screen.dash-theme-app-wide.dash-theme-beach .main-content .page:not(#page-dashboard) .card,
  #app-screen.dash-theme-app-wide.dash-theme-beach .modal .card {
    border: 1px solid rgba(212, 184, 150, 0.32) !important;
    background: linear-gradient(168deg, rgba(8, 116, 144, 0.88) 0%, rgba(212, 184, 150, 0.28) 100%) !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    box-shadow: inset 0 1px 0 rgba(254, 243, 199, 0.14) !important;
  }
  html.ct-light #app-screen.dash-theme-app-wide.dash-theme-beach {
    background: linear-gradient(180deg, #bae6fd 0%, #7dd3fc 28%, #fde68a 52%, #f0e6d2 78%, #e8d5b5 100%);
  }
  html.ct-light #app-screen.dash-theme-app-wide.dash-theme-beach .nav-sidebar,
  html.ct-light #app-screen.dash-theme-app-wide.dash-theme-beach .top-bar,
  html.ct-light #app-screen.dash-theme-app-wide.dash-theme-beach .main-header {
    background: rgba(254, 249, 231, 0.94);
    border-color: rgba(180, 140, 90, 0.28);
  }
`;
if (oldAppWide.test(s)) s = s.replace(oldAppWide, newAppWide);

fs.writeFileSync(indexPath, s);
console.log("beach theme applied:", indexPath);
