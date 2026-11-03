const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");
h = h.replace(/Kullanıcı Adı veya Telefon/g, "Kullanıcı adı");
h = h.replace(/placeholder="kullanici_adi veya 5523554903"/g, 'placeholder="kullanici_adi"');
fs.writeFileSync(p, h);
console.log("done");
