import { download_btn, capture } from "./elements.js";
import { map } from "./plotMap.js";

/**
 * Download dropdown + capture-to-image with:
 * - loading overlay
 * - cancel button (does NOT truly abort html2canvas; it prevents download + hides overlay)
 * - excludes `.card-footer` from capture
 * - gracefully skips map snapshot/replace when `map` is not available (null/undefined) or not rendered
 */

let activeCaptureToken = null;

export function downloadButton(matrix) {
  download_btn.innerHTML += `
    <ul class="dropdown-menu" aria-labelledby="capture-dropdown">
      <li><a class="dropdown-item" href="https://ws-data.nisra.gov.uk/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${matrix}/CSV/1.0/">data (in CSV format)</a></li>
      <li><a class="dropdown-item" href="https://ws-data.nisra.gov.uk/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${matrix}/XLSX/2007/">data (in Excel format)</a></li>
      <li><a class="dropdown-item" href="#" id="download-capture">charts (as image)</a></li>
    </ul>
  `;

  document.getElementById("download-capture").addEventListener("click", async (e) => {
    e.preventDefault();

    // If a capture is already running, ignore repeated clicks
    if (activeCaptureToken && !activeCaptureToken.done) return;

    const cardEl = document.getElementById(capture.id);
    const mapContainerEl = document.getElementById("map-container");
    const rawText =
      document.getElementById("map-title")?.textContent?.trim() ||
      document.getElementById("chart-title")?.textContent?.trim() ||
      "capture";

    const fileName = rawText
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "capture";

    // Cancellation token for this run
    const token = { cancelled: false, done: false };
    activeCaptureToken = token;

    try {
      showCaptureLoading("Generating image…");
      // Let the overlay paint before heavy work starts
      await new Promise(requestAnimationFrame);

      await exportCardWithMap(cardEl, map, mapContainerEl, `${fileName}.png`, token);
    } catch (err) {
      console.error(err);
      // Only show failure if the user didn't cancel
      if (!token.cancelled) alert("Sorry — the image export failed.");
    } finally {
      token.done = true;
      // Only clear if we're still the active capture
      if (activeCaptureToken === token) activeCaptureToken = null;
      hideCaptureLoading();
    }
  });
}

async function exportCardWithMap(cardEl, mapInstance, mapContainerEl, filename, token) {
  // Allow cancel before starting any heavy work
  if (token?.cancelled) return;

  // Detect whether we should attempt a map snapshot/replace
  const hasMap =
    !!mapInstance &&
    typeof mapInstance.once === "function" &&
    typeof mapInstance.getCanvas === "function";

  const mapContainerVisible = (() => {
    if (!mapContainerEl) return false;
    // If container or its parents are display:none, offsetParent will be null (except for fixed pos; not the case here)
    if (mapContainerEl.offsetParent === null) return false;
    // Also treat 0x0 as "not rendered"
    if (mapContainerEl.clientWidth === 0 || mapContainerEl.clientHeight === 0) return false;
    return true;
  })();

  let dataUrl = null;

  // Only do map-specific work if a map exists AND the container is visible/rendered
  if (hasMap && mapContainerVisible) {
    // Wait until map is fully rendered
    await new Promise((resolve) => mapInstance.once("idle", resolve));
    if (token?.cancelled) return;

    // Snapshot the WebGL canvas
    const mapCanvas = mapInstance.getCanvas();
    try {
      dataUrl = mapCanvas.toDataURL("image/png");
    } catch (err) {
      // If the map snapshot fails, we still want to capture the rest of the card
      console.warn("Map canvas export failed (continuing without map snapshot):", err);
      dataUrl = null;
    }
    if (token?.cancelled) return;
  }

  // Capture WITHOUT touching the live DOM
  const canvas = await html2canvas(cardEl, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,

    // Force html2canvas "virtual viewport" to match your real one,
    // so Bootstrap keeps the same breakpoint (xl, etc.)
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,

    // Exclude footers
    ignoreElements: (el) => el.classList?.contains("card-footer"),

    onclone: (clonedDoc) => {
      // If user cancelled, skip clone manipulation
      if (token?.cancelled) return;

      // Always lock the cloned card width (keeps Bootstrap breakpoint/layout consistent)
      const clonedCard = clonedDoc.getElementById(cardEl.id);
      if (clonedCard) {
        clonedCard.style.width = `${cardEl.getBoundingClientRect().width}px`;
      }

      // Only replace the cloned map container if we actually got a snapshot
      if (!dataUrl) return;

      const clonedMapContainer = mapContainerEl
        ? clonedDoc.getElementById(mapContainerEl.id)
        : null;

      if (!clonedMapContainer) return;

      // If the cloned container is not visible / has no size, skip
      const w = mapContainerEl.clientWidth;
      const h = mapContainerEl.clientHeight;
      if (!w || !h) return;

      clonedMapContainer.style.width = `${w}px`;
      clonedMapContainer.style.height = `${h}px`;

      clonedMapContainer.innerHTML = "";
      const img = clonedDoc.createElement("img");
      img.src = dataUrl;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      clonedMapContainer.appendChild(img);
    }
  });

  // If cancelled while html2canvas was running, do not download
  if (token?.cancelled) return;

  // Download
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function showCaptureLoading(message = "Generating image…") {
  let overlay = document.getElementById("capture-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "capture-loading-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(255,255,255,0.75)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.backdropFilter = "blur(2px)";

    overlay.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:12px; padding:16px 20px; background:#fff; border:1px solid rgba(0,0,0,.1); border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.12); min-width: 280px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:32px; height:32px; border:3px solid rgba(0,0,0,.15); border-top-color: rgba(0,0,0,.55); border-radius:50%; animation: captureSpin .9s linear infinite;"></div>
          <div id="capture-loading-text" style="font: 500 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;">${message}</div>
        </div>
        <button id="capture-cancel-btn" type="button"
          style="padding:6px 12px; border-radius:8px; border:1px solid rgba(0,0,0,.2); background:#fff; cursor:pointer; font: 600 13px system-ui;">
          Cancel
        </button>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `@keyframes captureSpin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);

    document.body.appendChild(overlay);
  } else {
    const text = overlay.querySelector("#capture-loading-text");
    if (text) text.textContent = message;
    overlay.style.display = "flex";
  }

  // Ensure cancel button always targets the currently active capture
  const cancelBtn = document.getElementById("capture-cancel-btn");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (activeCaptureToken) activeCaptureToken.cancelled = true;
      hideCaptureLoading(); // hide immediately for responsiveness
    };
  }
}

function hideCaptureLoading() {
  const overlay = document.getElementById("capture-loading-overlay");
  if (overlay) overlay.style.display = "none";
}
