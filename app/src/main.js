// Wires the editor: pick a layout and a grade, put a photo in each panel (upload, drag and
// drop, or a sample), drag a panel's photo to crop it, write the caption, export a PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { EXPORT_SIZES, LAYOUTS, PRESETS, TITLE_COLORS, applyLayout, defaultState, layoutPanels } from './state.js';
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const status = $('status');
const state = defaultState();
const photos = { boulevard: null, pier: null };
let uploadCount = 0;

function currentSize() {
  return EXPORT_SIZES[state.size];
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function ensurePhoto(id) {
  if (photos[id]) return photos[id];
  if (id === 'boulevard' || id === 'pier') {
    photos[id] = await loadImage(`samples/${id}.jpg`);
    return photos[id];
  }
  return null;
}

async function ensureAllPhotos() {
  for (const panel of state.panels) {
    if (panel.photo) await ensurePhoto(panel.photo).catch(() => { panel.photo = null; });
  }
}

async function redraw() {
  await ensureAllPhotos();
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, photos, w, h, state.selectedPanel);
}

/** Rebuilds the panel buttons and the photo controls for the selected panel. */
function renderPanelControls() {
  const list = $('panels');
  list.innerHTML = '';
  layoutPanels(state).forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `panel-btn${i === state.selectedPanel ? ' active' : ''}`;
    b.textContent = `Panel ${i + 1}${panel.photo ? ` · ${photoLabel(panel.photo)}` : ' · empty'}`;
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      renderPanelControls();
      redraw();
    });
    list.appendChild(b);
  });
  const panel = state.panels[state.selectedPanel];
  $('zoom').value = panel.zoom;
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('photoName').textContent = panel.photo ? photoLabel(panel.photo) : 'No photo — sunset panel';
}

function photoLabel(id) {
  if (id === 'boulevard') return 'Boulevard sample';
  if (id === 'pier') return 'Pier sample';
  return photos[id] ? photos[id].name : id;
}

function setPanelPhoto(id) {
  state.panels[state.selectedPanel].photo = id;
  state.panels[state.selectedPanel].zoom = 1;
  state.panels[state.selectedPanel].ox = 0;
  state.panels[state.selectedPanel].oy = 0;
  renderPanelControls();
  redraw();
}

async function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  uploadCount += 1;
  const id = `up${uploadCount}`;
  const img = await loadImage(URL.createObjectURL(file));
  img.name = file.name;
  photos[id] = img;
  setPanelPhoto(id);
  status.textContent = `Loaded ${file.name} into Panel ${state.selectedPanel + 1}`;
}

/** Draws the cover at the chosen export size and downloads it as a PNG. */
export async function exportCoverPNG() {
  await document.fonts.ready;
  await ensureAllPhotos();
  const { w, h } = currentSize();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), state, photos, w, h, -1);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved vice-cover-${w}x${h}.png`;
      resolve(blob);
    }, 'image/png');
  });
}

// --- Layout and preset pickers -------------------------------------------------
function buildPicker(el, entries, current, onPick) {
  el.innerHTML = '';
  for (const [key, entry] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick${key === current ? ' active' : ''}`;
    b.textContent = entry.name ?? entry.label;
    b.addEventListener('click', () => {
      onPick(key);
      buildPicker(el, entries, key, onPick);
    });
    el.appendChild(b);
  }
}

buildPicker($('layouts'), LAYOUTS, state.layout, (key) => {
  applyLayout(state, key);
  renderPanelControls();
  redraw();
});
buildPicker($('presets'), PRESETS, state.preset, (key) => {
  state.preset = key;
  redraw();
});
buildPicker(
  $('sizes'),
  Object.fromEntries(EXPORT_SIZES.map((s, i) => [i, { label: s.label }])),
  state.size,
  (key) => {
    state.size = Number(key);
    redraw();
  },
);

// Title colour swatches.
for (const color of TITLE_COLORS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.style.background = color;
  b.setAttribute('aria-label', `Title colour ${color}`);
  b.addEventListener('click', () => {
    state.titleColor = color;
    document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
    b.classList.add('active');
    redraw();
  });
  if (color === state.titleColor) b.classList.add('active');
  $('swatches').appendChild(b);
}

// --- Caption controls ----------------------------------------------------------
$('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
$('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
$('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  $('titleSizeVal').textContent = `${Math.round(state.titleSize * 100)}%`;
  redraw();
});
$('titlePos').addEventListener('change', (e) => {
  state.titlePosition = e.target.value;
  redraw();
});

// --- Photo controls ------------------------------------------------------------
$('sampleBoulevard').addEventListener('click', () => setPanelPhoto('boulevard'));
$('samplePier').addEventListener('click', () => setPanelPhoto('pier'));
$('upload').addEventListener('change', async (e) => {
  await addUpload(e.target.files[0]);
  e.target.value = '';
});
$('applyAll').addEventListener('click', () => {
  const photo = state.panels[state.selectedPanel].photo;
  for (const panel of state.panels) panel.photo = photo;
  renderPanelControls();
  redraw();
});
$('clearPanel').addEventListener('click', () => setPanelPhoto(null));
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(state.panels[state.selectedPanel].zoom * 100)}%`;
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  renderPanelControls();
  redraw();
});

// --- Canvas interaction: click a panel to select it, drag to pan its photo ------
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = currentSize();
  return {
    x: ((e.clientX - rect.left) / rect.width) * w,
    y: ((e.clientY - rect.top) / rect.height) * h,
  };
}

function panelAt(x, y) {
  const { w, h } = currentSize();
  return layoutPanels(state).findIndex((panel) => {
    const r = panel.rect;
    return x >= r.x * w && x < (r.x + r.w) * w && y >= r.y * h && y < (r.y + r.h) * h;
  });
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selectedPanel = i;
  renderPanelControls();
  const panel = state.panels[i];
  drag = { x, y, ox: panel.ox, oy: panel.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const { w, h } = currentSize();
  const panel = state.panels[state.selectedPanel];
  const rect = layoutPanels(state)[state.selectedPanel].rect;
  panel.ox = drag.ox + (x - drag.x) / (rect.w * w);
  panel.oy = drag.oy + (y - drag.y) / (rect.h * h);
  if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 4) drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});

// Drag a photo file onto the preview to put it in the selected panel.
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  await addUpload(e.dataTransfer.files[0]);
});

$('export').addEventListener('click', exportCoverPNG);

// --- Boot ----------------------------------------------------------------------
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    photos,
    ensurePhoto,
    redraw,
    exportCoverPNG,
    renderPanelControls,
  });
} else {
  document.fonts.ready.then(() => {
    renderPanelControls();
    redraw();
  });
}
