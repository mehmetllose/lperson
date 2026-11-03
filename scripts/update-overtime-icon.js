const fs = require("fs");
const sharp = require("sharp");

const iconSrc =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Desktop-yv/assets/c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_15_May_2026_20_44_51-b1886011-5884-47cd-820f-0de477128ee7.png";
const htmlPath = "c:/Users/PC/Desktop/yv/public/index.html";
const outSm = "c:/Users/PC/Desktop/yv/public/overtime-icon-sm.png";
const outFull = "c:/Users/PC/Desktop/yv/public/overtime-icon.png";

async function makeTransparentIcon(pixelSize) {
  const { data, info } = await sharp(iconSrc)
    .resize(pixelSize, pixelSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  const ch = info.channels;
  for (let i = 0; i < px.length; i += ch) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = Math.max(r, g, b);
    if (lum < 55) {
      px[i + 3] = 0;
    } else {
      const a = Math.min(255, Math.round(((lum - 55) / (255 - 55)) * 255));
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.max(a, 180);
    }
  }

  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(iconSrc)) {
    console.error("missing", iconSrc);
    process.exit(1);
  }
  const fullBuf = await makeTransparentIcon(72);
  const smBuf = await makeTransparentIcon(48);
  fs.writeFileSync(outFull, fullBuf);
  fs.writeFileSync(outSm, smBuf);
  const b64 = smBuf.toString("base64");

  let h = fs.readFileSync(htmlPath, "utf8");
  h = h.replace(/const OVERTIME_ICON_DATA = "data:image\/png;base64,[^"]+";/, `const OVERTIME_ICON_DATA = "data:image/png;base64,${b64}";`);

  if (!h.includes("OVERTIME_ICON_SCALE")) {
    h = h.replace(
      `    function overtimeIconHtml(size) {
      const s = size || 14;
      return '<img src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="vertical-align:middle;display:inline-block;object-fit:contain;"/>';`,
      `    const OVERTIME_ICON_SCALE = 1.5;
    function overtimeIconHtml(size) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      return '<img src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="vertical-align:middle;display:inline-block;object-fit:contain;"/>';`
    );
  }

  fs.writeFileSync(htmlPath, h);
  console.log("updated", { full: fullBuf.length, sm: smBuf.length, scale: h.includes("OVERTIME_ICON_SCALE") });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
