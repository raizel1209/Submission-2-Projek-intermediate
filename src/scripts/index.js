import "../styles/styles.css";
import "leaflet/dist/leaflet.css";

import App from "./pages/app";
import { getAccessToken } from "./utils/auth";
import { registerServiceWorker } from "./utils/index"; 

const token = getAccessToken();
const url = location.hash;

if (!location.hash || location.hash === "#") {
  location.hash = getAccessToken() ? "#/" : "#/login";
}

const app = new App({
  content: document.querySelector("#main-content"),
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navbar"), 
});

window.addEventListener("hashchange", () => {
  app.renderPage();
});

window.addEventListener("load", async () => {
  await registerServiceWorker('./sw.js');
  
  app.renderPage();
});