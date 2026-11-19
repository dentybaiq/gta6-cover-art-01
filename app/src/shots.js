// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos loaded;
// ?shot=cover shows the cover alone at a chosen size; ?shot=export runs the app's own
// export and leaves the PNG bytes in window.__exportDataUrl. window.__shotReady is set
// once the scene has painted. All photos are the app's own samples, free to use.
import { EXPORT_SIZES, applyLayout } from './state.js';
import { drawCover } from './cover.js';

function applyParams(query, state) {
  if (query.get('layout')) applyLayout(state, query.get('layout'));
  if (query.get('preset')) state.preset = query.get('preset');
  if (query.get('title') !== null) state.title = query.get('title');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  if (query.get('titleColor')) state.titleColor = query.get('titleColor');
  const list = (query.get('photos') ?? '').split(',').filter(Boolean);
  list.forEach((photo, i) => {
    if (state.panels[i]) state.panels[i].photo = photo === 'none' ? null : photo;
  });
}

function pickSize(query) {
  const size = query.get('size');
  if (!size) return EXPORT_SIZES[0];
  const [w, h] = size.split('x').map(Number);
  return { w, h, label: size };
}

async function ready() {
  await document.fonts.ready;
  await document.fonts.load('80px Anton');
  await document.fonts.load('40px Pacifico');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, app) {
  const { state, photos, ensurePhoto, redraw, renderPanelControls } = app;
  applyParams(query, state);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'export') {
    const { w, h } = pickSize(query);
    for (const panel of state.panels) {
      if (panel.photo) await ensurePhoto(panel.photo).catch(() => { panel.photo = null; });
    }
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), state, photos, w, h, -1);
    const canvas = document.getElementById('preview');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(off, 0, 0);
    document.body.classList.add('shot-cover');
    await new Promise((resolve) => {
      off.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          window.__exportDataUrl = reader.result;
          window.__exportReady = true;
          resolve();
        };
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
    await ready();
    return;
  }
  await redraw();
  renderPanelControls();
  await ready();
}
