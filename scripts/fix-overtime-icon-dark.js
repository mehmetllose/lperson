const fs = require("fs");
const sharp = require("sharp");

const iconSrc =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Desktop-yv/assets/c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_64ef05ef-27b7-4e34-a032-433d835535f8-bb4d0909-f9da-4248-849f-8e6161111b80.png";
const htmlPath = "c:/Users/PC/Desktop/yv/public/index.html";

async function makeDarkTransparentIcon(pixelSize) {
  const { data, info } = await sharp(iconSrc)
    .resize(pixelSize, pixelSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  const ch = info.channels;
  for (let i = 0; i < px.length; i += ch) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2]);
    if (lum > 210) {
      px[i + 3] = 0;
    } else {
      const a = Math.min(255, Math.round(((210 - lum) / 210) * 255));
      px[i] = 28;
      px[i + 1] = 28;
      px[i + 2] = 32;
      px[i + 3] = Math.max(a, 40);
    }
  }

  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(iconSrc)) {
    console.error("missing icon", iconSrc);
    process.exit(1);
  }
  const smBuf = await makeDarkTransparentIcon(72);
  fs.writeFileSync("c:/Users/PC/Desktop/yv/public/overtime-icon-sm.png", smBuf);
  let h = fs.readFileSync(htmlPath, "utf8");
  h = h.replace(
    /const OVERTIME_ICON_DATA = "data:image\/png;base64,[^"]+";/,
    `const OVERTIME_ICON_DATA = "data:image/png;base64,${smBuf.toString("base64")}";`
  );
  h = h.replace(
    /function overtimeIconHtml\(size\) \{[\s\S]*?return '<img src="' \+ OVERTIME_ICON_DATA \+ '"[^']+';/,
    `function overtimeIconHtml(size) {
      const base = size || 14;
      const s = Math.round(base * OVERTIME_ICON_SCALE);
      return '<img src="' + OVERTIME_ICON_DATA + '" width="' + s + '" height="' + s + '" alt="" style="vertical-align:middle;display:inline-block;object-fit:contain;background:transparent;"/>';`
  );
  fs.writeFileSync(htmlPath, h);
  console.log("overtime icon updated", smBuf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
