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

// An arbitrary rectangle centered at (x, y).
function box(id, color, x, y, w, h) {
  return { id, color, shape: { kind: 'rect', w, h }, target: { x, y, rot: 0 }, sym: 180 }
}

// A disc centered at (x, y).
function disc(id, color, x, y, r) {
  return { id, color, shape: { kind: 'circle', r }, target: { x, y, rot: 0 }, sym: 'full' }
}

export const FLAGS = [
  {
    id: 'fr',
    code: 'fr',
    name: 'France',
    blocks: [
      vstripe('fr-blue', '#000091', 0),
      vstripe('fr-white', '#ffffff', 1),
      vstripe('fr-red', '#e1000f', 2),
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
      vstripe('be-yellow', '#ffd90c', 1),
      vstripe('be-red', '#f31830', 2),
    ],
  },
  {
    id: 'ng',
    code: 'ng',
    name: 'Nigeria',
    blocks: [
      vstripe('ng-green1', '#008753', 0),
      vstripe('ng-white', '#ffffff', 1),
      vstripe('ng-green2', '#008753', 2),
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
      hstripe('de-red', '#ff0000', 1),
      hstripe('de-gold', '#ffcc00', 2),
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
      hstripe('ua-blue', '#0057b8', 0, 2),
      hstripe('ua-yellow', '#ffd700', 1, 2),
    ],
  },
  {
    id: 'ie',
    code: 'ie',
    name: 'Ireland',
    blocks: [
      vstripe('ie-green', '#009a49', 0),
      vstripe('ie-white', '#ffffff', 1),
      vstripe('ie-orange', '#ff7900', 2),
    ],
  },
  {
    id: 'ro',
    code: 'ro',
    name: 'Romania',
    blocks: [
      vstripe('ro-blue', '#00319c', 0),
      vstripe('ro-yellow', '#ffde00', 1),
      vstripe('ro-red', '#de2110', 2),
    ],
  },

  // ---- horizontal tricolours ----
  { id: 'ru', code: 'ru', name: 'Russia', blocks: [hstripe('ru-white', '#ffffff', 0), hstripe('ru-blue', '#0039A6', 1), hstripe('ru-red', '#D52B1E', 2)] },
  { id: 'at', code: 'at', name: 'Austria', blocks: [hstripe('at-red1', '#c8102e', 0), hstripe('at-white', '#ffffff', 1), hstripe('at-red2', '#c8102e', 2)] },
  { id: 'ee', code: 'ee', name: 'Estonia', blocks: [hstripe('ee-blue', '#1791ff', 0), hstripe('ee-black', '#000000', 1), hstripe('ee-white', '#ffffff', 2)] },
  { id: 'hu', code: 'hu', name: 'Hungary', blocks: [hstripe('hu-red', '#d43516', 0), hstripe('hu-white', '#ffffff', 1), hstripe('hu-green', '#388d00', 2)] },
  { id: 'bg', code: 'bg', name: 'Bulgaria', blocks: [hstripe('bg-white', '#ffffff', 0), hstripe('bg-green', '#00966E', 1), hstripe('bg-red', '#D62612', 2)] },
  { id: 'lt', code: 'lt', name: 'Lithuania', blocks: [hstripe('lt-yellow', '#FDB913', 0), hstripe('lt-green', '#006A44', 1), hstripe('lt-red', '#C1272D', 2)] },
  { id: 'lu', code: 'lu', name: 'Luxembourg', blocks: [hstripe('lu-red', '#ED2939', 0), hstripe('lu-white', '#ffffff', 1), hstripe('lu-blue', '#00A1DE', 2)] },
  { id: 'am', code: 'am', name: 'Armenia', blocks: [hstripe('am-red', '#D90012', 0), hstripe('am-blue', '#0033A0', 1), hstripe('am-orange', '#F2A800', 2)] },
  { id: 'ga', code: 'ga', name: 'Gabon', blocks: [hstripe('ga-green', '#36a100', 0), hstripe('ga-yellow', '#ffe700', 1), hstripe('ga-blue', '#006dbc', 2)] },
  { id: 'sl', code: 'sl', name: 'Sierra Leone', blocks: [hstripe('sl-green', '#00cd00', 0), hstripe('sl-white', '#ffffff', 1), hstripe('sl-blue', '#0000cd', 2)] },

  // ---- vertical tricolours ----
  { id: 'td', code: 'td', name: 'Chad', blocks: [vstripe('td-blue', '#002664', 0), vstripe('td-yellow', '#FECB00', 1), vstripe('td-red', '#C60C30', 2)] },
  { id: 'gn', code: 'gn', name: 'Guinea', blocks: [vstripe('gn-red', '#ff0000', 0), vstripe('gn-yellow', '#ffff00', 1), vstripe('gn-green', '#009900', 2)] },
  { id: 'ml', code: 'ml', name: 'Mali', blocks: [vstripe('ml-green', '#009a00', 0), vstripe('ml-yellow', '#ffff00', 1), vstripe('ml-red', '#ff0000', 2)] },
  { id: 'ci', code: 'ci', name: 'Ivory Coast', blocks: [vstripe('ci-orange', '#ff9a00', 0), vstripe('ci-white', '#ffffff', 1), vstripe('ci-green', '#00cd00', 2)] },

  // ---- two bands ----
  { id: 'pl', code: 'pl', name: 'Poland', blocks: [hstripe('pl-white', '#ffffff', 0, 2), hstripe('pl-red', '#DC143C', 1, 2)] },
  { id: 'id', code: 'id', name: 'Indonesia', blocks: [hstripe('id-red', '#e70011', 0, 2), hstripe('id-white', '#ffffff', 1, 2)] },

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
    blocks: [field('se-field', '#005293'), vbar('se-cross-v', '#fecb00', 240, 80), hband('se-cross-h', '#fecb00', 240, 96)],
  },
  {
    id: 'dk', code: 'dk', name: 'Denmark',
    blocks: [field('dk-field', '#C8102E'), vbar('dk-cross-v', '#ffffff', 242, 69), hband('dk-cross-h', '#ffffff', 240, 69)],
  },
  {
    id: 'fi', code: 'fi', name: 'Finland',
    blocks: [field('fi-field', '#ffffff'), vbar('fi-cross-v', '#002f6c', 231, 107), hband('fi-cross-h', '#002f6c', 240, 131)],
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
      hband('ae-green', '#00732f', 80, 160),
      hband('ae-white', '#ffffff', 240, 160),
      hband('ae-black', '#000000', 400, 160),
      vbar('ae-red', '#ff0000', 80, 160),
    ],
  },

  // ---- more horizontal bands ----
  { id: 'ye', code: 'ye', name: 'Yemen', blocks: [hstripe('ye-red', '#f10600', 0), hstripe('ye-white', '#ffffff', 1), hstripe('ye-black', '#000000', 2)] },
  {
    id: 'lv', code: 'lv', name: 'Latvia',
    blocks: [hband('lv-red1', '#981e32', 96, 192), hband('lv-white', '#ffffff', 240, 96), hband('lv-red2', '#981e32', 384, 192)],
  },

  // ---- more Nordic crosses ----
  {
    id: 'no', code: 'no', name: 'Norway',
    blocks: [
      field('no-field', '#ed2939'),
      vbar('no-white-v', '#ffffff', 240, 120),
      hband('no-white-h', '#ffffff', 240, 120),
      vbar('no-blue-v', '#002664', 240, 60),
      hband('no-blue-h', '#002664', 240, 60),
    ],
  },
  {
    id: 'is', code: 'is', name: 'Iceland',
    blocks: [
      field('is-field', '#003897'),
      vbar('is-white-v', '#ffffff', 240, 106.6),
      hband('is-white-h', '#ffffff', 240, 106.6),
      vbar('is-red-v', '#d72828', 240, 53.4),
      hband('is-red-h', '#d72828', 240, 53.4),
    ],
  },

  // ---- centred cross ----
  {
    id: 'gb-eng', code: 'gb-eng', name: 'England',
    blocks: [field('eng-field', '#ffffff'), vbar('eng-red-v', '#ce1124', 320, 76.8), hband('eng-red-h', '#ce1124', 240, 76.8)],
  },

  // ---- field + disc ----
  {
    id: 'pw', code: 'pw', name: 'Palau',
    blocks: [field('pw-field', '#4aadd6'), disc('pw-disc', '#ffde00', 200, 232, 133)],
  },
  {
    id: 'la', code: 'la', name: 'Laos',
    blocks: [field('la-field', '#ce1126'), hband('la-blue', '#002868', 240, 241.4), disc('la-disc', '#ffffff', 320, 240, 103.4)],
  },

  // ---- panels ----
  {
    id: 'mg', code: 'mg', name: 'Madagascar',
    blocks: [
      vbar('mg-white', '#ffffff', 106.65, 213.3),
      box('mg-red', '#fc3d32', 426.65, 120, 426.7, 240),
      box('mg-green', '#007e3a', 426.65, 360, 426.7, 240),
    ],
  },
  {
    id: 'bw', code: 'bw', name: 'Botswana',
    blocks: [field('bw-field', '#00cbff'), hband('bw-white', '#ffffff', 240, 160), hband('bw-black', '#000000', 240, 108)],
  },
]
