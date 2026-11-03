/* Capacitor / file:// için: node-qrcode tarayıcı girişi, global QRCode */
const QRCode = require("qrcode/lib/browser.js");
if (typeof globalThis !== "undefined") globalThis.QRCode = QRCode;
