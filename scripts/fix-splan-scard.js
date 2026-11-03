const fs = require("fs");
const p = require("path").join(__dirname, "..", "public", "index.html");
let h = fs.readFileSync(p, "utf8");
h = h.replace(/class="splan-worker-name""/g, 'class="splan-worker-name"');
if (!h.includes("min-height:22px")) {
  h = h.replace(
    "letter-spacing:-.3px;margin-top:1px;\">${value}</div>",
    "letter-spacing:-.3px;margin-top:2px;min-height:22px;display:flex;align-items:center;justify-content:flex-end;line-height:1.15;\">${value}</div>"
  );
}
if (!h.includes("text-align:right;min-width:78px")) {
  h = h.replace(
    "const scard = (label,value,col) =>\n        `<div style=\"text-align:right;\">",
    "const scard = (label,value,col) =>\n        `<div style=\"text-align:right;min-width:78px;\">"
  );
}
fs.writeFileSync(p, h);
console.log("fixed");
