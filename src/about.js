import { share_btn } from "./utils/elements.js";
import { sharePage } from "./utils/sharePage.js";
import { loadTables } from "./utils/loadTables.js";
import { initCookieConsent } from "./utils/cookies.js";

window.addEventListener("DOMContentLoaded", async () => {
    for (let i = 0; i < share_btn.length; i++) {
      share_btn[i].onclick = sharePage;
    }

    try {
        let tables = await loadTables();  // ← cached load
        document.getElementById("num-tables").innerText = tables.table_count.toLocaleString();

        initCookieConsent({
                bannerId: 'cookie-banner',
                gtmId: 'GTM-KF6WGSG'
        });

      } catch (error) {
        console.error("Failed to load tables:", error);
        return; // bail early if we truly have nothing
      }

});
