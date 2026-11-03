const fs = require("fs");
const https = require("https");

const TR_MONTHS = {
  OCAK: 1, ŞUBAT: 2, SUBAT: 2, MART: 3, NİSAN: 4, NISAN: 4, MAYIS: 5, HAZİRAN: 6, HAZIRAN: 6,
  TEMMUZ: 7, AĞUSTOS: 8, AGUSTOS: 8, EYLÜL: 9, EKİM: 10, EKIM: 10, KASIM: 11, ARALIK: 12,
};

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMonthYear(raw, fallbackYear) {
  const t = stripHtml(raw).toUpperCase().replace(/İ/g, "I").replace(/ı/g, "I");
  const m = t.match(/([A-ZÇĞÖŞÜ]+)\s*[-–]?\s*(\d{4})/);
  if (!m) return null;
  const mon = TR_MONTHS[m[1].replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U").replace(/I/g, "I")] || TR_MONTHS[m[1]];
  if (!mon) return null;
  return { month: mon, year: parseInt(m[2], 10) || fallbackYear };
}

function parseDiyanetHtml(html, wantYear) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(html)) !== null) {
    const chunk = tr[1];
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(chunk)) !== null) tds.push(stripHtml(td[1]));
    if (tds.length < 7) continue;
    const name = tds[6];
    if (!name || /^\.+$/.test(name.replace(/\s/g, ""))) continue;
    const day = parseInt(tds[3], 10);
    const my = parseMonthYear(tds[4], wantYear);
    if (!day || !my || my.year !== wantYear) continue;
    const date = `${my.year}-${String(my.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    rows.push({ date, name, kind: "dini" });
  }
  return rows;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
}

(async () => {
  const year = 2026;
  const urls = [
    `https://vakithesaplama.diyanet.gov.tr/dinigunler.php?yil=${year}`,
    `https://vakithesaplama.diyanet.gov.tr/icerik.php?icerik=${152 + year - 2025}`,
  ];
  for (const url of urls) {
    try {
      const html = await fetchUrl(url);
      const rows = parseDiyanetHtml(html, year);
      console.log(url, "len", html.length, "rows", rows.length);
      console.log(rows.filter((r) => /BAYRAM|AREFE/i.test(r.name)).slice(0, 8));
    } catch (e) {
      console.log(url, "ERR", e.message);
    }
  }
  const local = fs.readFileSync("c:/Users/PC/Desktop/yv/scripts/diyanet-sample.html", "utf8");
  const rows = parseDiyanetHtml(local, 2026);
  console.log("local rows", rows.length, rows.filter((r) => /BAYRAM|AREFE/i.test(r.name)));
})();
