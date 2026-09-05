// The preview and PDF use the same fixed A4 layout, including measured line
// wrapping and explicit continuation pages. Browser printing cannot repaginate it.
export const PORTFOLIO_PAGE = { width: 595, height: 842 };
const INK = "#141b19", TEAL = "#039caa", GREEN = "#79cd49";
const BODY = "Arial, sans-serif", DISPLAY = "Impact, 'Arial Narrow', sans-serif";
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export const safePortfolioImage = value => /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value || "");
const normalizeText = value => String(value || "").replace(/\r\n?/g, "\n").trim();

export function wrapPortfolioText(value, width, size, measure, font = BODY, weight = 400) {
  const lines = [];
  for (const paragraph of normalizeText(value).split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let line = "";
    // Break long unspaced strings too, so names, URLs, and Thai do not escape.
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next, size, font, weight) <= width) { line = next; continue; }
      if (line) { lines.push(line); line = ""; }
      for (const character of Array.from(word)) {
        if (line && measure(line + character, size, font, weight) > width) { lines.push(line); line = ""; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function portfolioTextMeasure() {
  let context;
  try { context = document.createElement("canvas").getContext("2d"); } catch {}
  return (text, size, font = BODY, weight = 400) => {
    if (!context?.measureText) return Array.from(text).length * size * 0.57;
    context.font = `${weight} ${size}px ${font}`;
    return context.measureText(text).width;
  };
}

export function layoutPortfolio(data, form = {}, photos = [], measure = portfolioTextMeasure()) {
  const pages = [];
  const images = photos.filter(photo => safePortfolioImage(photo.dataUrl));
  const rect = (ops, x, y, w, h, fill, stroke) => ops.push({ type: "rect", x, y, w, h, fill, stroke });
  const text = (ops, value, x, y, size, fill = INK, font = BODY, weight = 400) => ops.push({ type: "text", value, x, y, size, fill, font, weight });
  const lines = (ops, values, x, y, size, leading, fill = INK, font = BODY, weight = 400) => values.forEach((value, index) => text(ops, value, x, y + index * leading, size, fill, font, weight));
  const wrap = (value, width, size, font = BODY, weight = 400) => wrapPortfolioText(value, width, size, measure, font, weight);
  const background = () => [
    { type: "rect", x: 0, y: 0, w: 595, h: 842, fill: "#fafcf7" },
    { type: "path", d: "M300 0H595V230C420 390 520 570 130 842H0V800C420 530 270 210 300 0Z", fill: "#e4f1ce" },
    { type: "path", d: "M595 70V260C335 460 490 620 170 842H70C430 555 245 385 595 70Z", fill: "#f4f9e9" },
    { type: "path", d: "M595 490V548L290 842H245Z", fill: "#cfe8a6" },
  ];
  const footer = (ops, label, number) => {
    rect(ops, 36, 797, 523, 1, INK);
    text(ops, label, 36, 815, 8, "#4b5850", BODY, 700);
    text(ops, String(number).padStart(2, "0"), 540, 815, 9, INK, BODY, 700);
  };
  const addImage = (ops, photo, x, y, w, h) => {
    rect(ops, x, y, w, h, "#fff", "#c4d2bf");
    ops.push({ type: "image", src: photo.dataUrl, alt: photo.caption || "Portfolio photograph", x: x + 6, y: y + 6, w: w - 12, h: h - 12 });
  };
  const cover = background();
  text(cover, "UNIVERSITY APPLICATION", 36, 49, 10, INK, BODY, 700);
  rect(cover, 36, 64, 523, 1, INK);
  const titleSize = Math.min(103, 103 * 523 / measure("PORTFOLIO", 103, DISPLAY, 400));
  text(cover, "PORT", 36, 162, titleSize, TEAL, DISPLAY);
  text(cover, "FOLIO", 36 + measure("PORT", titleSize, DISPLAY, 400), 162, titleSize, INK, DISPLAY);
  rect(cover, 36, 184, 523, 5, GREEN);
  const identity = normalizeText(form.name) || normalizeText(data.title);
  let nameSize = 38;
  while (nameSize > 16 && wrap(identity, 475, nameSize, DISPLAY).length > 3) nameSize--;
  const nameLines = wrap(identity, 475, nameSize, DISPLAY);
  if (nameLines.length > 5) throw new Error("The portfolio name or title is too long for its cover. Shorten it before exporting.");
  const nameHeight = Math.max(72, nameLines.length * (nameSize + 5) + 28);
  rect(cover, 36, 210, 523, nameHeight, INK);
  lines(cover, nameLines, 52, 230 + nameSize, nameSize, nameSize + 5, "#fff", DISPLAY);
  const detailLines = wrap([form.target, form.contact].filter(Boolean).join("\n"), 510, 12);
  if (detailLines.length > 10) throw new Error("The course or contact details are too long for the cover. Move longer details into the portfolio sections.");
  const detailY = 210 + nameHeight + 28;
  lines(cover, detailLines, 38, detailY, 12, 19);
  const photoTop = detailY + detailLines.length * 19 + 16;
  const coverPhoto = images.find(photo => photo.placement === "cover") || (!images[0]?.placement ? images[0] : null);
  if (coverPhoto) {
    const captions = coverPhoto.caption ? wrap(coverPhoto.caption, 510, 11) : [];
    const photoHeight = 765 - photoTop - captions.length * 16;
    if (photoHeight < 110) throw new Error("The cover details leave too little room for the photograph. Shorten the cover details.");
    addImage(cover, coverPhoto, 36, photoTop, 523, photoHeight);
    lines(cover, captions, 38, photoTop + photoHeight + 19, 11, 16, "#4b5850");
  } else {
    if (photoTop < 650) {
      text(cover, "MY STORY.", 36, Math.max(520, photoTop + 40), 68, TEAL, DISPLAY);
      text(cover, "MY NEXT CHAPTER.", 36, Math.max(585, photoTop + 105), 48, INK, DISPLAY);
    }
  }
  footer(cover, "PERSONAL PORTFOLIO", 1);
  pages.push({ label: "Cover", ops: cover });

  const sections = [{ heading: "About me", body: data.introduction }, ...data.sections];
  const remaining = images.filter(photo => photo !== coverPhoto);
  const defaultSection = [ /project/i, /activit/i, /achievement/i ].map(pattern => sections.findIndex(section => pattern.test(section.heading))).find(index => index > 0) || 1;
  let current, top = 0;
  const newContentPage = label => {
    const ops = background();
    text(ops, String(pages.length).padStart(2, "0"), 36, 98, 57, TEAL, DISPLAY);
    const headingSize = Math.min(48, 48 * 417 / measure(label, 48, DISPLAY, 400));
    text(ops, label, 142, 94, headingSize, INK, DISPLAY);
    rect(ops, 36, 123, 523, 1, INK);
    footer(ops, "UNIVERSITY APPLICATION PORTFOLIO", pages.length + 1);
    current = { label, ops }; pages.push(current); top = 144;
  };
  sections.forEach((section, sectionIndex) => {
    const selected = remaining.filter(photo => {
      const index = Number(photo.placement);
      return photo.placement && Number.isInteger(index) && index >= 0 && index < data.sections.length ? index + 1 === sectionIndex : sectionIndex === defaultSection;
    });
    const headingLines = wrap(section.heading.toUpperCase(), 490, 18, DISPLAY);
    if (headingLines.length > 3) throw new Error("A portfolio section heading is too long. Shorten it before exporting.");
    const headingHeight = 16 + headingLines.length * 22;
    const bodyLines = wrap(section.body, 487, 13);
    let offset = 0, photoOffset = 0, continuation = 0;
    if (selected.length || !current) newContentPage(selected.length ? "EXPERIENCE" : "PROFILE");
    do {
      const photoBatch = selected.slice(photoOffset, photoOffset + 2);
      if (continuation || 770 - top < headingHeight + 36 + Math.min(4, bodyLines.length) * 20) newContentPage(selected.length ? "EXPERIENCE" : "PROFILE");
      const ops = current.ops;
      rect(ops, 36, top, 523, headingHeight, INK);
      lines(ops, headingLines, 49, top + 26, 18, 22, "#fff", DISPLAY);
      top += headingHeight + 12;
      if (continuation) { text(ops, "CONTINUED", 36, top + 8, 8, TEAL, BODY, 700); top += 22; }
      if (photoBatch.length) {
        const w = photoBatch.length === 2 ? 254 : 523;
        const captionLines = photoBatch.map(photo => photo.caption ? wrap(photo.caption, w - 6, 11) : []);
        const captionHeight = Math.max(0, ...captionLines.map(values => values.length * 16));
        const photoTop = top;
        photoBatch.forEach((photo, index) => {
          const x = 36 + index * 269;
          addImage(ops, photo, x, photoTop, w, 244);
          lines(ops, captionLines[index], x + 3, photoTop + 262, 11, 16, "#4b5850");
        });
        top += 268 + captionHeight; photoOffset += photoBatch.length;
      }
      const available = Math.floor((770 - top - 24) / 20);
      if (available < 2) throw new Error("A photo caption or heading is too long for this page. Shorten it and try again.");
      if (offset < bodyLines.length) {
        while (!bodyLines[offset] && offset < bodyLines.length - 1) offset++;
        // Leave at least two lines on the continuation page when possible.
        const count = bodyLines.length - offset === available + 1 ? available - 1 : available;
        const batch = bodyLines.slice(offset, offset + count);
        rect(ops, 36, top, 523, batch.length * 20 + 24, "#ffffff", "#c4d2bf");
        lines(ops, batch, 54, top + 25, 13, 20);
        offset += batch.length;
        top += batch.length * 20 + 44;
      }
      continuation++;
    } while (offset < bodyLines.length || photoOffset < selected.length);
  });
  return pages;
}

export function portfolioPageSvg(page) {
  const ops = page.ops.map(op => {
    if (op.type === "rect") return `<rect x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" fill="${op.fill}"${op.stroke ? ` stroke="${op.stroke}"` : ""}/>`;
    if (op.type === "path") return `<path d="${op.d}" fill="${op.fill}"/>`;
    if (op.type === "text") return `<text x="${op.x}" y="${op.y}" font-size="${op.size}" font-family="${esc(op.font)}" font-weight="${op.weight}" fill="${op.fill}" xml:space="preserve">${esc(op.value)} </text>`;
    if (op.type === "image") return `<image role="img" aria-label="${esc(op.alt)}" href="${op.src}" x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" preserveAspectRatio="xMidYMid meet"/>`;
    return "";
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" width="595" height="842" style="display:block;width:100%;height:auto" aria-label="${esc(page.label)}">${ops}</svg>`;
}

export async function drawPortfolioPage(page, scale = 3) {
  const canvas = document.createElement("canvas");
  canvas.width = 595 * scale; canvas.height = 842 * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the PDF. Please try again in another browser.");
  context.scale(scale, scale);
  for (const op of page.ops) {
    context.fillStyle = op.fill || INK;
    if (op.type === "rect") { context.fillRect(op.x, op.y, op.w, op.h); if (op.stroke) { context.strokeStyle = op.stroke; context.strokeRect(op.x, op.y, op.w, op.h); } }
    if (op.type === "path") context.fill(new Path2D(op.d));
    if (op.type === "text") { context.font = `${op.weight} ${op.size}px ${op.font}`; context.fillText(op.value, op.x, op.y); }
    if (op.type === "image") {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        const fail = () => { clearTimeout(timeout); reject(new Error("A portfolio photo could not be loaded. Reattach it before downloading.")); };
        const timeout = setTimeout(fail, 15000);
        image.onload = () => { clearTimeout(timeout); if (image.naturalWidth && image.naturalHeight) resolve(image); else fail(); };
        image.onerror = fail; image.src = op.src;
      });
      const ratio = Math.min(op.w / img.naturalWidth, op.h / img.naturalHeight);
      const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
      context.drawImage(img, op.x + (op.w - w) / 2, op.y + (op.h - h) / 2, w, h);
    }
  }
  return canvas;
}

export async function createPortfolioPdf(data, form = {}, photos = []) {
  if (document.fonts?.ready) await document.fonts.ready;
  const pages = layoutPortfolio(data, form, photos);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [595, 842], compress: true });
  pdf.setProperties({ title: form.name ? `${form.name} - Portfolio` : data.title, subject: "University application portfolio", author: form.name || "" });
  for (let index = 0; index < pages.length; index++) {
    if (index) pdf.addPage([595, 842], "portrait");
    const canvas = await drawPortfolioPage(pages[index]);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 595, 842, undefined, "FAST");
    canvas.width = 0; canvas.height = 0;
  }
  return { pdf, pageCount: pages.length };
}
