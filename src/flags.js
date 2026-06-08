import mxEmblem from './emblems/mx.svg'

// Flag specs in a 640 x 480 (4:3) coordinate space — the same proportions
// flag-icons uses, so emblems extracted from those SVGs would line up later.
//
// Each block has:
//   shape:  { kind: 'rect', w, h }
//         | { kind: 'circle', r }
//         | { kind: 'path', d, cx, cy, half }  — a real emblem path (640x480 space)
//         | { kind: 'image', href, w, h }       — a real multi-color emblem asset
//   color:  fill
//   target: { x, y, rot }  — the CORRECT center position + rotation (degrees)
//   sym:    rotational symmetry for win-checking:
//             360 = orientation matters (emblems)
//             180 = looks identical every half-turn (most rects)
//             'full' = any rotation is fine (circles)
//
// Most flags below are fully geometric, so they render 100% accurately from
// this data; emblem flags (Canada, Mexico) pull their symbol from real artwork.

export const FLAG_W = 640
export const FLAG_H = 480

const third = FLAG_W / 3

function vstripe(id, color, index) {
  return {
    id,
    color,
    shape: { kind: 'rect', w: third, h: FLAG_H },
    target: { x: third * index + third / 2, y: FLAG_H / 2, rot: 0 },
    sym: 180,
  }
}

// Horizontal stripe; `count` is the number of equal bands (default 3).
function hstripe(id, color, index, count = 3) {
  const h = FLAG_H / count
  return {
    id,
    color,
    shape: { kind: 'rect', w: FLAG_W, h },
    target: { x: FLAG_W / 2, y: h * index + h / 2, rot: 0 },
    sym: 180,
  }
}

// A full-width horizontal band of arbitrary height at a given vertical center.
function hband(id, color, yCenter, h) {
  return { id, color, shape: { kind: 'rect', w: FLAG_W, h }, target: { x: FLAG_W / 2, y: yCenter, rot: 0 }, sym: 180 }
}

// A full-height vertical bar of arbitrary width at a given horizontal center.
function vbar(id, color, xCenter, w) {
  return { id, color, shape: { kind: 'rect', w, h: FLAG_H }, target: { x: xCenter, y: FLAG_H / 2, rot: 0 }, sym: 180 }
}

// The whole flag field.
function field(id, color) {
  return { id, color, shape: { kind: 'rect', w: FLAG_W, h: FLAG_H }, target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 }, sym: 180 }
}

export const FLAGS = [
  {
    id: 'fr',
    code: 'fr',
    name: 'France',
    blocks: [
      vstripe('fr-blue', '#002654', 0),
      vstripe('fr-white', '#ffffff', 1),
      vstripe('fr-red', '#ED2939', 2),
    ],
  },
  {
    id: 'it',
    code: 'it',
    name: 'Italy',
    blocks: [
      vstripe('it-green', '#009246', 0),
      vstripe('it-white', '#ffffff', 1),
      vstripe('it-red', '#CE2B37', 2),
    ],
  },
  {
    id: 'be',
    code: 'be',
    name: 'Belgium',
    blocks: [
      vstripe('be-black', '#000000', 0),
      vstripe('be-yellow', '#FAE042', 1),
      vstripe('be-red', '#ED2939', 2),
    ],
  },
  {
    id: 'ng',
    code: 'ng',
    name: 'Nigeria',
    blocks: [
      vstripe('ng-green1', '#008751', 0),
      vstripe('ng-white', '#ffffff', 1),
      vstripe('ng-green2', '#008751', 2),
    ],
  },
  {
    id: 'jp',
    code: 'jp',
    name: 'Japan',
    blocks: [
      {
        id: 'jp-field',
        color: '#ffffff',
        shape: { kind: 'rect', w: FLAG_W, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        // Disc diameter = 3/5 of the flag height (official spec).
        id: 'jp-disc',
        color: '#BC002D',
        shape: { kind: 'circle', r: (FLAG_H * 3 / 5) / 2 },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 'full',
      },
    ],
  },
  {
    id: 'ca',
    code: 'ca',
    name: 'Canada',
    blocks: [
      {
        // White centre field (1:2:1 construction).
        id: 'ca-white',
        color: '#ffffff',
        shape: { kind: 'rect', w: FLAG_W / 2, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        id: 'ca-bar-left',
        color: '#d52b1e',
        shape: { kind: 'rect', w: FLAG_W / 4, h: FLAG_H },
        target: { x: FLAG_W / 8, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        id: 'ca-bar-right',
        color: '#d52b1e',
        shape: { kind: 'rect', w: FLAG_W / 4, h: FLAG_H },
        target: { x: FLAG_W * 7 / 8, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        // The real maple-leaf path, lifted straight out of flag-icons' ca.svg.
        // Orientation matters here, so sym = 360.
        id: 'ca-leaf',
        color: '#d52b1e',
        shape: {
          kind: 'path',
          cx: 320,
          cy: 240,
          half: 165,
          d: 'M201 232l-13.3 4.4 61.4 54c4.7 13.7-1.6 17.8-5.6 25l66.6-8.4-1.6 67 13.9-.3-3.1-66.6 66.7 8c-4.1-8.7-7.8-13.3-4-27.2l61.3-51-10.7-4c-8.8-6.8 3.8-32.6 5.6-48.9 0 0-35.7 12.3-38 5.8l-9.2-17.5-32.6 35.8c-3.5.9-5-.5-5.9-3.5l15-74.8-23.8 13.4q-3.2 1.3-5.2-2.2l-23-46-23.6 47.8q-2.8 2.5-5 .7L264 130.8l13.7 74.1c-1.1 3-3.7 3.8-6.7 2.2l-31.2-35.3c-4 6.5-6.8 17.1-12.2 19.5s-23.5-4.5-35.6-7c4.2 14.8 17 39.6 9 47.7',
        },
        target: { x: 320, y: 240, rot: 0 },
        sym: 360,
      },
    ],
  },
  {
    id: 'mx',
    code: 'mx',
    name: 'Mexico',
    blocks: [
      vstripe('mx-green', '#006847', 0),
      vstripe('mx-white', '#ffffff', 1),
      vstripe('mx-red', '#ce1126', 2),
      {
        // The real coat of arms, extracted whole from flag-icons' mx.svg
        // (eagle, snake, cactus — multi-color with gradients). One sticker.
        id: 'mx-coa',
        shape: { kind: 'image', href: mxEmblem, w: 159.9, h: 144.8 },
        target: { x: 320, y: 240, rot: 0 },
        sym: 360,
      },
    ],
  },
  {
    id: 'de',
    code: 'de',
    name: 'Germany',
    blocks: [
      hstripe('de-black', '#000000', 0),
      hstripe('de-red', '#DD0000', 1),
      hstripe('de-gold', '#FFCE00', 2),
    ],
  },
  {
    id: 'nl',
    code: 'nl',
    name: 'Netherlands',
    blocks: [
      hstripe('nl-red', '#AE1C28', 0),
      hstripe('nl-white', '#ffffff', 1),
      hstripe('nl-blue', '#21468B', 2),
    ],
  },
  {
    id: 'ua',
    code: 'ua',
    name: 'Ukraine',
    blocks: [
      hstripe('ua-blue', '#0057B7', 0, 2),
      hstripe('ua-yellow', '#FFDD00', 1, 2),
    ],
  },
  {
    id: 'ie',
    code: 'ie',
    name: 'Ireland',
    blocks: [
      vstripe('ie-green', '#169B62', 0),
      vstripe('ie-white', '#ffffff', 1),
      vstripe('ie-orange', '#FF883E', 2),
    ],
  },
  {
    id: 'ro',
    code: 'ro',
    name: 'Romania',
    blocks: [
      vstripe('ro-blue', '#002B7F', 0),
      vstripe('ro-yellow', '#FCD116', 1),
      vstripe('ro-red', '#CE1126', 2),
    ],
  },

  // ---- horizontal tricolours ----
  { id: 'ru', code: 'ru', name: 'Russia', blocks: [hstripe('ru-white', '#ffffff', 0), hstripe('ru-blue', '#0039A6', 1), hstripe('ru-red', '#D52B1E', 2)] },
  { id: 'at', code: 'at', name: 'Austria', blocks: [hstripe('at-red1', '#ED2939', 0), hstripe('at-white', '#ffffff', 1), hstripe('at-red2', '#ED2939', 2)] },
  { id: 'ee', code: 'ee', name: 'Estonia', blocks: [hstripe('ee-blue', '#0072CE', 0), hstripe('ee-black', '#000000', 1), hstripe('ee-white', '#ffffff', 2)] },
  { id: 'hu', code: 'hu', name: 'Hungary', blocks: [hstripe('hu-red', '#CD2A3E', 0), hstripe('hu-white', '#ffffff', 1), hstripe('hu-green', '#436F4D', 2)] },
  { id: 'bg', code: 'bg', name: 'Bulgaria', blocks: [hstripe('bg-white', '#ffffff', 0), hstripe('bg-green', '#00966E', 1), hstripe('bg-red', '#D62612', 2)] },
  { id: 'lt', code: 'lt', name: 'Lithuania', blocks: [hstripe('lt-yellow', '#FDB913', 0), hstripe('lt-green', '#006A44', 1), hstripe('lt-red', '#C1272D', 2)] },
  { id: 'lu', code: 'lu', name: 'Luxembourg', blocks: [hstripe('lu-red', '#ED2939', 0), hstripe('lu-white', '#ffffff', 1), hstripe('lu-blue', '#00A1DE', 2)] },
  { id: 'am', code: 'am', name: 'Armenia', blocks: [hstripe('am-red', '#D90012', 0), hstripe('am-blue', '#0033A0', 1), hstripe('am-orange', '#F2A800', 2)] },
  { id: 'ga', code: 'ga', name: 'Gabon', blocks: [hstripe('ga-green', '#009E60', 0), hstripe('ga-yellow', '#FCD116', 1), hstripe('ga-blue', '#3A75C4', 2)] },
  { id: 'sl', code: 'sl', name: 'Sierra Leone', blocks: [hstripe('sl-green', '#1EB53A', 0), hstripe('sl-white', '#ffffff', 1), hstripe('sl-blue', '#0072C6', 2)] },

  // ---- vertical tricolours ----
  { id: 'td', code: 'td', name: 'Chad', blocks: [vstripe('td-blue', '#002664', 0), vstripe('td-yellow', '#FECB00', 1), vstripe('td-red', '#C60C30', 2)] },
  { id: 'gn', code: 'gn', name: 'Guinea', blocks: [vstripe('gn-red', '#CE1126', 0), vstripe('gn-yellow', '#FCD116', 1), vstripe('gn-green', '#009460', 2)] },
  { id: 'ml', code: 'ml', name: 'Mali', blocks: [vstripe('ml-green', '#14B53A', 0), vstripe('ml-yellow', '#FCD116', 1), vstripe('ml-red', '#CE1126', 2)] },
  { id: 'ci', code: 'ci', name: 'Ivory Coast', blocks: [vstripe('ci-orange', '#F77F00', 0), vstripe('ci-white', '#ffffff', 1), vstripe('ci-green', '#009E60', 2)] },

  // ---- two bands ----
  { id: 'pl', code: 'pl', name: 'Poland', blocks: [hstripe('pl-white', '#ffffff', 0, 2), hstripe('pl-red', '#DC143C', 1, 2)] },
  { id: 'id', code: 'id', name: 'Indonesia', blocks: [hstripe('id-red', '#CE1126', 0, 2), hstripe('id-white', '#ffffff', 1, 2)] },

  // ---- five bands ----
  {
    id: 'th', code: 'th', name: 'Thailand',
    blocks: [
      hband('th-red1', '#A51931', 40, 80),
      hband('th-white1', '#F4F5F8', 120, 80),
      hband('th-blue', '#2D2A4A', 240, 160),
      hband('th-white2', '#F4F5F8', 360, 80),
      hband('th-red2', '#A51931', 440, 80),
    ],
  },

  // ---- Nordic crosses (off-centre cross) ----
  {
    id: 'se', code: 'se', name: 'Sweden',
    blocks: [field('se-field', '#006AA7'), vbar('se-cross-v', '#FECC00', 240, 80), hband('se-cross-h', '#FECC00', 240, 96)],
  },
  {
    id: 'dk', code: 'dk', name: 'Denmark',
    blocks: [field('dk-field', '#C8102E'), vbar('dk-cross-v', '#ffffff', 242, 69), hband('dk-cross-h', '#ffffff', 240, 69)],
  },
  {
    id: 'fi', code: 'fi', name: 'Finland',
    blocks: [field('fi-field', '#ffffff'), vbar('fi-cross-v', '#003580', 231, 107), hband('fi-cross-h', '#003580', 240, 131)],
  },

  // ---- field + disc ----
  {
    id: 'bd', code: 'bd', name: 'Bangladesh',
    blocks: [
      field('bd-field', '#006A4E'),
      { id: 'bd-disc', color: '#F42A41', shape: { kind: 'circle', r: 96 }, target: { x: 288, y: 240, rot: 0 }, sym: 'full' },
    ],
  },

  // ---- bar + stripes ----
  {
    id: 'ae', code: 'ae', name: 'United Arab Emirates',
    blocks: [
      hband('ae-green', '#009739', 80, 160),
      hband('ae-white', '#ffffff', 240, 160),
      hband('ae-black', '#000000', 400, 160),
      vbar('ae-red', '#EF3340', 80, 160),
    ],
  },
]
