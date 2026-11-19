// Draws the whole cover onto a 2D canvas context at any size: panels with their photos
// (cover-fit, per-panel zoom and pan), the Vice City grade, a synthwave sunset for any
// empty panel, the bold caption block, grain and a vignette. Pure canvas, no network.
import { LAYOUTS, PRESETS, layoutPanels } from './state.js';

/** A tiny deterministic random stream, so the grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one panel's photo cover-fit inside rect, with its zoom and pan offsets. */
export function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** A stylised synthwave sunset for a panel with no photo: gradient sky, a slit sun, a grid floor. */
export function drawSunsetPanel(ctx, rect, preset) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, preset.skyTop);
  sky.addColorStop(0.55, preset.skyMid);
  sky.addColorStop(1, preset.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.42;
  const r = Math.min(w, h) * 0.26;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, preset.sun);
  glow.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = preset.sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = preset.skyMid;
  let slit = r * 0.12;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - r, cy + r * 0.08 + i * r * 0.22, r * 2, slit);
    slit *= 1.5;
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  const horizon = y + h * 0.66;
  ctx.beginPath();
  ctx.moveTo(x, horizon);
  ctx.lineTo(x + w, horizon);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 1; i <= 4; i++) {
    const gy = horizon + (h - horizon) * (i / 4) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * w * 0.09, horizon);
    ctx.lineTo(cx + i * w * 0.34, y + h);
    ctx.stroke();
  }
}

/** The grade wash over one panel: warm top light, deep colour rising from the foot. */
function applyGrade(ctx, rect, preset) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, preset.washTop);
  wash.addColorStop(1, preset.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Splits a title into lines that fit maxWidth at the given font. */
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** The caption block: Anton title in capitals with a dark outline and neon shadow, Pacifico subtitle. */
export function drawTitleBlock(ctx, state, preset, w, h) {
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim();
  if (!title && !subtitle) return;
  const pad = w * 0.045;
  const maxWidth = w - pad * 2;
  let size = h * 0.115 * state.titleSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let lines = [];
  if (title) {
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (size > 14 && ctx.measureText(title).width > maxWidth) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    lines = wrapTitle(ctx, title, maxWidth);
  }
  const lineHeight = size * 0.98;
  const subSize = Math.max(16, size * 0.34);
  const subGap = subtitle ? subSize * 1.6 : 0;
  const blockH = lines.length * lineHeight + subGap;
  const top = state.titlePosition === 'top' ? pad : h - pad - blockH;
  let baseline = top + lineHeight * 0.82;
  ctx.save();
  ctx.shadowColor = preset.titleShadow;
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.03;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16, 4, 28, 0.9)';
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.fillStyle = state.titleColor || preset.title;
  for (const line of lines) {
    ctx.strokeText(line, w / 2, baseline);
    ctx.fillText(line, w / 2, baseline);
    baseline += lineHeight;
  }
  ctx.restore();
  if (subtitle) {
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(16, 4, 28, 0.8)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillStyle = preset.subtitle;
    ctx.fillText(subtitle, w / 2, top + lines.length * lineHeight + subSize * 1.05);
    ctx.restore();
  }
}

/** Speckled film grain over the whole cover, same on every export. */
function drawGrain(ctx, w, h) {
  const rand = mulberry32(20261119);
  const count = Math.floor((w * h) / 2600);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${0.05 + rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/** A soft dark vignette pulling the eye to the middle of the cover. */
function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(8, 2, 16, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the cover for `state` onto `ctx` at size w x h.
 * `photos` maps a photo id to a loaded image (or null); `highlight` is the index of the
 * panel to outline in the editor, or -1 for a clean export.
 */
export function drawCover(ctx, state, photos, w, h, highlight = -1) {
  const preset = PRESETS[state.preset];
  const gap = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, w, h);
  for (const [i, panel] of layoutPanels(state).entries()) {
    const r = panel.rect;
    const rect = {
      x: r.x * w + (r.x > 0 ? gap / 2 : 0),
      y: r.y * h + (r.y > 0 ? gap / 2 : 0),
      w: r.w * w - (r.x > 0 ? gap / 2 : 0) - (r.x + r.w < 1 ? gap / 2 : 0),
      h: r.h * h - (r.y > 0 ? gap / 2 : 0) - (r.y + r.h < 1 ? gap / 2 : 0),
    };
    const img = panel.photo ? photos[panel.photo] : null;
    if (img) drawPanelPhoto(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
    else drawSunsetPanel(ctx, rect, preset);
    applyGrade(ctx, rect, preset);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (i === highlight) {
      ctx.save();
      ctx.strokeStyle = '#ffe259';
      ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.007);
      ctx.setLineDash([Math.max(8, w * 0.012), Math.max(6, w * 0.008)]);
      ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
      ctx.restore();
    }
  }
  drawTitleBlock(ctx, state, preset, w, h);
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h);
  ctx.strokeStyle = preset.frame;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.globalAlpha = 1;
}
