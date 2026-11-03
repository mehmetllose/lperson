/**
 * Capacitor native plugins — bundled for plain HTML (public/index.html).
 * Build: npm run build:cap
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { BarcodeScanner, SupportedFormat } from "@capacitor-community/barcode-scanner";
import { Geolocation } from "@capacitor/geolocation";

window.__CT_CAP_PLUGINS = {
  Capacitor,
  StatusBar,
  StatusBarStyle: Style,
  PushNotifications,
  LocalNotifications,
  App,
  BarcodeScanner,
  SupportedFormat,
  Geolocation,
};
