// The cover's state: which layout and preset, what each panel holds, and the caption.
// Layouts are panel rectangles in fractions of the cover (x, y, w, h); every panel takes
// one photo, a zoom and a pan offset, so each panel can be cropped and positioned on its own.
export const LAYOUTS = {
  heroDuo: {
    name: 'Hero + Duo',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  grid: {
    name: 'Four Up',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  strip: {
    name: 'Hero Strip',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.34, h: 0.38 },
      { x: 0.34, y: 0.62, w: 0.33, h: 0.38 },
      { x: 0.67, y: 0.62, w: 0.33, h: 0.38 },
    ],
  },
};

// Colour grades: a wash over every panel, the sky of an empty panel, and the caption inks.
// All our own colours — hot pink, orange, teal and purple in a Vice City sunset grade.
export const PRESETS = {
  sunset: {
    name: 'Sunset',
    washTop: 'rgba(255, 110, 60, 0.10)',
    washBottom: 'rgba(214, 36, 128, 0.38)',
    skyTop: '#2b1055',
    skyMid: '#ff5e62',
    skyBottom: '#ff9966',
    sun: '#ffd76a',
    title: '#ffffff',
    titleShadow: '#ff2e88',
    subtitle: '#ffd76a',
    frame: '#ffffff',
  },
  neon: {
    name: 'Neon',
    washTop: 'rgba(0, 229, 255, 0.12)',
    washBottom: 'rgba(255, 0, 128, 0.34)',
    skyTop: '#0b1035',
    skyMid: '#7b2ff7',
    skyBottom: '#00e5ff',
    sun: '#ff2e88',
    title: '#ffffff',
    titleShadow: '#00e5ff',
    subtitle: '#00e5ff',
    frame: '#f5f0ff',
  },
  vice: {
    name: 'Vice',
    washTop: 'rgba(255, 183, 0, 0.10)',
    washBottom: 'rgba(124, 58, 237, 0.36)',
    skyTop: '#1c0533',
    skyMid: '#c724b1',
    skyBottom: '#ffb347',
    sun: '#ffe259',
    title: '#fff7d6',
    titleShadow: '#c724b1',
    subtitle: '#ff9de2',
    frame: '#ffffff',
  },
};

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

export const TITLE_COLORS = ['#ffffff', '#ffd76a', '#ff2e88', '#00e5ff'];

/** A fresh cover: hero-duo layout, sunset grade, boulevard in the hero, pier below it. */
export function defaultState() {
  return {
    layout: 'heroDuo',
    preset: 'sunset',
    size: 0,
    title: 'Boulevard Queen',
    subtitle: 'Vice City nights',
    titleColor: '#ffffff',
    titleSize: 1,
    titlePosition: 'bottom',
    selectedPanel: 0,
    panels: [
      { photo: 'boulevard', zoom: 1, ox: 0, oy: 0 },
      { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Panels for the state's layout, padded or trimmed to the state's panel list. */
export function layoutPanels(state) {
  const def = LAYOUTS[state.layout].panels;
  return def.map((rect, i) => ({
    rect,
    photo: state.panels[i] ? state.panels[i].photo : null,
    zoom: state.panels[i] ? state.panels[i].zoom : 1,
    ox: state.panels[i] ? state.panels[i].ox : 0,
    oy: state.panels[i] ? state.panels[i].oy : 0,
  }));
}

/** Switch layout, keeping each panel's photo and crop where the new layout has a panel. */
export function applyLayout(state, layout) {
  const count = LAYOUTS[layout].panels.length;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push(state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 });
  }
  state.layout = layout;
  state.panels = panels;
  state.selectedPanel = 0;
}
