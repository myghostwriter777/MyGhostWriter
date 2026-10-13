// Release raster backing stores as soon as serialization finishes. A large
// deck otherwise keeps one 1600x900 surface per slide until the next GC pass.
const releaseCanvas = canvas => { canvas.width = 0; canvas.height = 0; };

export function slideCanvasDataUrl(canvas, type, quality) {
  try { return canvas.toDataURL(type, quality); }
  finally { releaseCanvas(canvas); }
}

export async function slideCanvasBlob(canvas, type, quality) {
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The slide image took too long to prepare. Please try again.")), 30000);
      try {
        canvas.toBlob(blob => {
          clearTimeout(timer);
          if (blob) resolve(blob);
          else reject(new Error("The slide image could not be prepared."));
        }, type, quality);
      } catch (error) { clearTimeout(timer); reject(error); }
    });
  } finally { releaseCanvas(canvas); }
}

export function loadSlideImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; };
    const fail = () => {
      cleanup(); image.src = "";
      reject(new Error("A slide image could not be loaded. Reattach it before exporting."));
    };
    const timer = setTimeout(fail, 15000);
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { fail(); return; }
      cleanup(); resolve(image);
    };
    image.onerror = fail;
    try { image.src = src; } catch { fail(); }
  });
}

export async function loadDeckSlideImages(deck) {
  const sources = new Map();
  for (const slide of deck?.slides || []) for (const item of slide.customImages || []) {
    if (!sources.has(item.dataUrl)) sources.set(item.dataUrl, []);
    sources.get(item.dataUrl).push(item.id);
  }
  const queue = [...sources];
  const images = new Map();
  let next = 0, failure;
  const worker = async () => {
    while (!failure && next < queue.length) {
      const [src, ids] = queue[next++];
      try {
        const image = await loadSlideImage(src);
        ids.forEach(id => images.set(id, image));
      } catch (error) { failure = error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
  if (failure) throw failure;
  return images;
}

let pptxPending;
export function loadPptxGenerator() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  if (pptxPending) return pptxPending;
  pptxPending = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gwm-pptx="true"]');
    const script = existing || document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", ready);
      script.removeEventListener("error", failed);
    };
    const fail = message => { cleanup(); script.remove(); reject(new Error(message)); };
    const ready = () => {
      if (!window.PptxGenJS) { fail("Google Slides export did not finish loading. Please try again."); return; }
      cleanup(); resolve(window.PptxGenJS);
    };
    const failed = () => fail("Google Slides export could not load. Please try again.");
    const timer = setTimeout(() => fail("Google Slides export took too long to load. Please try again."), 30000);
    script.addEventListener("load", ready);
    script.addEventListener("error", failed);
    if (!existing) {
      script.src = "/pptxgen.bundle.js"; script.async = true; script.dataset.gwmPptx = "true";
      try { document.head.appendChild(script); } catch { failed(); }
    }
  }).finally(() => { pptxPending = null; });
  return pptxPending;
}
