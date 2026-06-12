import mxEmblem from './emblems/mx.svg'
import usStripes from './emblems/us-stripes.svg'
import usStars from './emblems/us-stars.svg'
import grStripes from './emblems/gr-stripes.svg'
import tgStripes from './emblems/tg-stripes.svg'
import cmStar from './emblems/cm-star.svg'
import brGlobe from './emblems/br-globe.svg'
import esArms from './emblems/es-arms.svg'
import ptEmblem from './emblems/pt-emblem.svg'
import krTaegeuk from './emblems/kr-taegeuk.svg'
import krTrigrams from './emblems/kr-trigrams.svg'

// Flag specs in a 640 x 480 (4:3) coordinate space — the same proportions
// flag-icons uses, so emblems extracted from those SVGs would line up later.
//
// Each block has:
//   shape:  { kind: 'rect', w, h }
//         | { kind: 'circle', r }
//         | { kind: 'path', d, cx, cy, w, h }  — a real emblem path; (cx,cy) is its
//             bbox center and w/h its true bbox size (640x480 space)
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
        id: 'jp-disc',
        color: '#bc002d',
        shape: { kind: 'circle', r: 149.2 },
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
        // White centre field (flag-icons' exact construction).
        id: 'ca-white',
        color: '#ffffff',
        shape: { kind: 'rect', w: 339.8, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        id: 'ca-bar-left',
        color: '#d52b1e',
        shape: { kind: 'rect', w: 150, h: FLAG_H },
        target: { x: 75, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        id: 'ca-bar-right',
        color: '#d52b1e',
        shape: { kind: 'rect', w: 150.2, h: FLAG_H },
        target: { x: 564.9, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      {
        // The real maple-leaf path, lifted straight out of flag-icons' ca.svg.
        // Orientation matters here, so sym = 360.
        id: 'ca-leaf',
        color: '#d52b1e',
        shape: {
          kind: 'path',
          cx: 311.1,
          cy: 242.3,
          w: 246.8,
          h: 326.4,
          d: 'M201 232l-13.3 4.4 61.4 54c4.7 13.7-1.6 17.8-5.6 25l66.6-8.4-1.6 67 13.9-.3-3.1-66.6 66.7 8c-4.1-8.7-7.8-13.3-4-27.2l61.3-51-10.7-4c-8.8-6.8 3.8-32.6 5.6-48.9 0 0-35.7 12.3-38 5.8l-9.2-17.5-32.6 35.8c-3.5.9-5-.5-5.9-3.5l15-74.8-23.8 13.4q-3.2 1.3-5.2-2.2l-23-46-23.6 47.8q-2.8 2.5-5 .7L264 130.8l13.7 74.1c-1.1 3-3.7 3.8-6.7 2.2l-31.2-35.3c-4 6.5-6.8 17.1-12.2 19.5s-23.5-4.5-35.6-7c4.2 14.8 17 39.6 9 47.7',
        },
        target: { x: 311.1, y: 242.3, rot: 0 },
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
      hband('th-red1', '#a51931', 41.25, 82.5),
      hband('th-white1', '#f4f5f8', 122.5, 80),
      hband('th-blue', '#2d2a4a', 242.5, 160),
      hband('th-white2', '#f4f5f8', 361.25, 77.5),
      hband('th-red2', '#a51931', 440, 80),
    ],
  },

  // ---- Nordic crosses (off-centre cross) ----
  {
    id: 'se', code: 'se', name: 'Sweden',
    blocks: [field('se-field', '#005293'), vbar('se-cross-v', '#fecb00', 224, 96), hband('se-cross-h', '#fecb00', 240, 96)],
  },
  {
    id: 'dk', code: 'dk', name: 'Denmark',
    blocks: [field('dk-field', '#c8102e'), vbar('dk-cross-v', '#ffffff', 240, 68.6), hband('dk-cross-h', '#ffffff', 240, 68.6)],
  },
  {
    id: 'fi', code: 'fi', name: 'Finland',
    blocks: [field('fi-field', '#ffffff'), vbar('fi-cross-v', '#002f6c', 240.9, 131), hband('fi-cross-h', '#002f6c', 240, 131)],
  },

  // ---- field + disc ----
  {
    id: 'bd', code: 'bd', name: 'Bangladesh',
    blocks: [
      field('bd-field', '#006A4E'),
      { id: 'bd-disc', color: '#f42a41', shape: { kind: 'circle', r: 160 }, target: { x: 280, y: 240, rot: 0 }, sym: 'full' },
    ],
  },

  // ---- bar + stripes ----
  {
    id: 'ae', code: 'ae', name: 'United Arab Emirates',
    blocks: [
      hband('ae-green', '#00732f', 80, 160),
      hband('ae-white', '#ffffff', 240, 160),
      hband('ae-black', '#000000', 400, 160),
      vbar('ae-red', '#ff0000', 110, 220),
    ],
  },

  // ---- more horizontal bands ----
  { id: 'ye', code: 'ye', name: 'Yemen', blocks: [hband('ye-red', '#f10600', 78.7, 157.4), hband('ye-white', '#ffffff', 240, 165.2), hband('ye-black', '#000000', 401.3, 157.4)] },
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
    blocks: [field('pw-field', '#4aadd6'), disc('pw-disc', '#ffde00', 270.1, 232.1, 134.6)],
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

  // ---- USA: stripes (one piece), canton, star field (one piece) ----
  {
    id: 'us', code: 'us', name: 'United States',
    blocks: [
      {
        // All 13 stripes as a single piece, extracted from flag-icons' us.svg.
        id: 'us-stripes',
        shape: { kind: 'image', href: usStripes, w: FLAG_W, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180, // the stripe pattern reads the same upside down
      },
      box('us-canton', '#192f5d', 182.4, 129.25, 364.8, 258.5),
      {
        // All 50 stars as a single piece (real star grid from us.svg).
        id: 'us-stars',
        shape: { kind: 'image', href: usStars, w: 364.8, h: 258.5 },
        target: { x: 182.4, y: 129.25, rot: 0 },
        sym: 360,
      },
    ],
  },

  // ---- centred crosses ----
  {
    id: 'ch', code: 'ch', name: 'Switzerland',
    blocks: [field('ch-field', '#ff0000'), box('ch-cross-h', '#ffffff', 320, 240, 300, 90), box('ch-cross-v', '#ffffff', 320, 240, 90, 300)],
  },

  // ---- Greece: striped background (one piece) + canton + cross ----
  {
    id: 'gr', code: 'gr', name: 'Greece',
    blocks: [
      {
        // All 9 stripes as a single piece, like the US flag's stripes.
        id: 'gr-stripes',
        shape: { kind: 'image', href: grStripes, w: FLAG_W, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180, // blue top & bottom — reads the same upside down
      },
      box('gr-canton', '#0d5eaf', 133.35, 133.35, 266.7, 266.7),
      box('gr-cross-v', '#ffffff', 133.35, 133.35, 53.3, 266.7),
      box('gr-cross-h', '#ffffff', 133.35, 133.35, 266.7, 53.3),
    ],
  },

  // ---- weighted bands ----
  {
    id: 'co', code: 'co', name: 'Colombia',
    blocks: [hband('co-yellow', '#ffe800', 120, 240), hband('co-blue', '#00148e', 300, 120), hband('co-red', '#da0010', 420, 120)],
  },
  { id: 'mc', code: 'mc', name: 'Monaco', blocks: [hstripe('mc-red', '#f31830', 0, 2), hstripe('mc-white', '#ffffff', 1, 2)] },
  { id: 'pe', code: 'pe', name: 'Peru', blocks: [vstripe('pe-red1', '#D91023', 0), vstripe('pe-white', '#ffffff', 1), vstripe('pe-red2', '#D91023', 2)] },

  // ---- triangle flags (real triangle paths from flag-icons) ----
  {
    id: 'cz', code: 'cz', name: 'Czechia',
    blocks: [
      hstripe('cz-white', '#ffffff', 0, 2),
      hstripe('cz-red', '#d7141a', 1, 2),
      { id: 'cz-tri', color: '#11457e', shape: { kind: 'path', d: 'M360 240 0 0v480z', cx: 180, cy: 240, w: 360, h: 480 }, target: { x: 180, y: 240, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'sd', code: 'sd', name: 'Sudan',
    blocks: [
      hstripe('sd-red', '#ff0000', 0),
      hstripe('sd-white', '#ffffff', 1),
      hstripe('sd-black', '#000000', 2),
      { id: 'sd-tri', color: '#009a00', shape: { kind: 'path', d: 'M0 0v512l341.3-256z', cx: 160, cy: 240, w: 320, h: 480, pre: 'scale(0.9375)' }, target: { x: 160, y: 240, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'ps', code: 'ps', name: 'Palestine',
    blocks: [
      hstripe('ps-black', '#000000', 0),
      hstripe('ps-white', '#ffffff', 1),
      hstripe('ps-green', '#009639', 2),
      { id: 'ps-tri', color: '#ed2e38', shape: { kind: 'path', d: 'm0 0 320 240L0 480Z', cx: 160, cy: 240, w: 320, h: 480 }, target: { x: 160, y: 240, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'kw', code: 'kw', name: 'Kuwait',
    blocks: [
      hstripe('kw-green', '#00d941', 0),
      hstripe('kw-white', '#ffffff', 1),
      hstripe('kw-red', '#f31830', 2),
      { id: 'kw-trap', color: '#000000', shape: { kind: 'path', d: 'M0 0v512l255.4-170.7.6-170.8z', cx: 120, cy: 240, w: 240, h: 480, pre: 'scale(0.9375)' }, target: { x: 120, y: 240, rot: 0 }, sym: 360 },
    ],
  },

  // ---- star flags (real star paths; a 5-point star repeats every 72°) ----
  {
    id: 'vn', code: 'vn', name: 'Vietnam',
    blocks: [
      field('vn-field', '#da251d'),
      { id: 'vn-star', color: '#ffff00', shape: { kind: 'path', d: 'M349.6 381 260 314.3l-89 67.3L204 272l-89-67.7 110.1-1 34.2-109.4L294 203l110.1.1-88.5 68.4 33.9 109.6z', cx: 323.3, cy: 222.9, w: 271, h: 269.7, pre: 'matrix(0.9375 0 0 0.9375 80 0)' }, target: { x: 323.3, y: 222.9, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'so', code: 'so', name: 'Somalia',
    blocks: [
      field('so-field', '#40a6ff'),
      { id: 'so-star', color: '#ffffff', shape: { kind: 'path', d: 'M336.5 381.2 254 327.7l-82.1 54 30.5-87.7-82-54.2L222 239l31.4-87.5 32.1 87.3 101.4.1-81.5 54.7z', cx: 317.8, cy: 249.9, w: 249.8, h: 215.8, pre: 'matrix(0.9375 0 0 0.9375 80 0)' }, target: { x: 317.8, y: 249.9, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'gh', code: 'gh', name: 'Ghana',
    blocks: [
      hstripe('gh-red', '#ce1126', 0),
      hstripe('gh-yellow', '#fcd116', 1),
      hstripe('gh-green', '#006b3f', 2),
      { id: 'gh-star', color: '#000000', shape: { kind: 'path', d: 'm320 160 52 160-136.1-98.9H404L268 320z', cx: 320, cy: 240, w: 168.1, h: 160 }, target: { x: 320, y: 240, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'sn', code: 'sn', name: 'Senegal',
    blocks: [
      vstripe('sn-green', '#0b7226', 0),
      vstripe('sn-yellow', '#ffff00', 1),
      vstripe('sn-red', '#bc0000', 2),
      { id: 'sn-star', color: '#0b7226', shape: { kind: 'path', d: 'M342 218.8h71.8l-56.6 43.6 20.7 69.3-56.6-43.6-56.6 41.6 20.7-67.3-56.6-43.6h69.8l22.7-71.3z', cx: 321.3, cy: 239.6, w: 185, h: 184.2 }, target: { x: 321.3, y: 239.6, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'bf', code: 'bf', name: 'Burkina Faso',
    blocks: [
      hstripe('bf-red', '#de0000', 0, 2),
      hstripe('bf-green', '#35a100', 1, 2),
      { id: 'bf-star', color: '#fff300', shape: { kind: 'path', d: 'm254.6 276.2-106-72.4h131L320 86.6 360.4 204l131-.1-106 72.4 40.5 117.3-106-72.6L214 393.4', cx: 320, cy: 240.1, w: 342.8, h: 307 }, target: { x: 320, y: 240.1, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'cl', code: 'cl', name: 'Chile',
    blocks: [
      box('cl-white', '#ffffff', 440, 120, 400, 240),
      box('cl-canton', '#0039a6', 120, 120, 240, 240),
      hband('cl-red', '#d52b1e', 360, 240),
      { id: 'cl-star', color: '#ffffff', shape: { kind: 'path', d: 'M167.8 191.7 128.2 162l-39.5 30 14.7-48.8L64 113.1l48.7-.5L127.8 64l15.5 48.5 48.7.1-39.2 30.4z', cx: 120, cy: 120, w: 120, h: 120, pre: 'scale(0.9375)' }, target: { x: 120, y: 120, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'tg', code: 'tg', name: 'Togo',
    blocks: [
      {
        // All 5 stripes as a single piece, like Greece and the US.
        id: 'tg-stripes',
        shape: { kind: 'image', href: tgStripes, w: FLAG_W, h: FLAG_H },
        target: { x: FLAG_W / 2, y: FLAG_H / 2, rot: 0 },
        sym: 180,
      },
      box('tg-canton', '#d80000', 143.7, 145.6, 287.3, 291.2),
      { id: 'tg-star', color: '#ffffff', shape: { kind: 'path', d: 'M134.4 128.4c0-.8 18.9-53 18.9-53l17 52.2s57.4 1.7 57.4.8-45.3 34.3-45.3 34.3 21.4 60 20.5 58.2-49.6-36-49.6-36-49.7 34.3-48.8 34.3c.8 0 18.8-56.5 18.8-56.5l-44.5-33.4z', cx: 143.7, cy: 138.9, w: 139.6, h: 136.4, pre: 'scale(0.9375)' }, target: { x: 143.7, y: 138.9, rot: 0 }, sym: 72 },
    ],
  },

  // ---- crescent flags ----
  {
    id: 'tr', code: 'tr', name: 'Turkey',
    blocks: [
      field('tr-field', '#e30a17'),
      { id: 'tr-disc-w', color: '#ffffff', shape: { kind: 'path', d: 'M407 247.5c0 66.2-54.6 119.9-122 119.9s-122-53.7-122-120 54.6-119.8 122-119.8 122 53.7 122 119.9', cx: 285, cy: 247.5, w: 244, h: 239.8 }, target: { x: 285, y: 247.5, rot: 0 }, sym: 'full' },
      { id: 'tr-disc-r', color: '#e30a17', shape: { kind: 'path', d: 'M413 247.5c0 53-43.6 95.9-97.5 95.9s-97.6-43-97.6-96 43.7-95.8 97.6-95.8 97.6 42.9 97.6 95.9z', cx: 315.5, cy: 247.5, w: 195.2, h: 191.8 }, target: { x: 315.5, y: 247.5, rot: 0 }, sym: 'full' },
      { id: 'tr-star', color: '#ffffff', shape: { kind: 'path', d: 'm430.7 191.5-1 44.3-41.3 11.2 40.8 14.5-1 40.7 26.5-31.8 40.2 14-23.2-34.1 28.3-33.9-43.5 12-25.8-37z', cx: 444.2, cy: 246.8, w: 111.6, h: 110.8 }, target: { x: 444.2, y: 246.8, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'tn', code: 'tn', name: 'Tunisia',
    blocks: [
      field('tn-field', '#e70013'),
      { id: 'tn-emblem', color: '#ffffff', shape: { kind: 'path', d: 'M320 119.2a1 1 0 0 0-1 240.3 1 1 0 0 0 1-240.3M392 293a90 90 0 1 1 0-107 72 72 0 1 0 0 107m-4.7-21.7-37.4-12.1-23.1 31.8v-39.3l-37.4-12.2 37.4-12.2V188l23.1 31.8 37.4-12.1-23.1 31.8z', cx: 319.5, cy: 239.4, w: 240.2, h: 240.3 }, target: { x: 319.5, y: 239.4, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'pk', code: 'pk', name: 'Pakistan',
    blocks: [
      field('pk-field', '#0c590b'),
      box('pk-hoist', '#ffffff', 70.2, 240, 140.4, 480),
      { id: 'pk-crescent', color: '#ffffff', shape: { kind: 'path', d: 'M415.4 306a121 121 0 0 1-161.3 59.4 122 122 0 0 1-59.5-162.1A119 119 0 0 1 266 139a156 156 0 0 0-11.8 10.9A112.3 112.3 0 0 0 415.5 306z', cx: 329.7, cy: 241.8, w: 217.7, h: 222.9, pre: 'matrix(0.9375 0 0 0.9375 49 0)' }, target: { x: 329.7, y: 241.8, rot: 0 }, sym: 360 },
      { id: 'pk-star', color: '#ffffff', shape: { kind: 'path', d: 'm403.7 225.4-31.2-6.6-16.4 27.3-3.4-31.6-31-7.2 29-13-2.7-31.7 21.4 23.6 29.3-12.4-15.9 27.6 21 24z', cx: 389.1, cy: 191.6, w: 77, h: 78.3, pre: 'matrix(0.9375 0 0 0.9375 49 0)' }, target: { x: 389.1, y: 191.6, rot: 0 }, sym: 72 },
    ],
  },

  // ---- weighted bands ----
  {
    id: 'cr', code: 'cr', name: 'Costa Rica',
    blocks: [
      hband('cr-blue1', '#0000b4', 37.7, 75.4),
      hband('cr-white1', '#ffffff', 116.6, 82.3),
      hband('cr-red', '#d90000', 236.6, 157.7),
      hband('cr-white2', '#ffffff', 356.6, 82.3),
      hband('cr-blue2', '#0000b4', 438.9, 82.3),
    ],
  },

  // ---- China: real unit-star path, 5 pieces (small stars have rotated targets) ----
  {
    id: 'cn', code: 'cn', name: 'China',
    blocks: [
      field('cn-field', '#ee1c25'),
      { id: 'cn-star-big', color: '#ffff00', shape: { kind: 'path', d: 'M-.6.8 0-1 .6.8-1-.3h2z', cx: 0, cy: -7.2, w: 144, h: 129.6, pre: 'scale(72)' }, target: { x: 120, y: 112.8, rot: 0 }, sym: 72 },
      { id: 'cn-star-1', color: '#ffff00', shape: { kind: 'path', d: 'M-.6.8 0-1 .6.8-1-.3h2z', cx: 0, cy: -2.4, w: 48, h: 43.2, pre: 'scale(24)' }, target: { x: 238.2, y: 49.2, rot: -120.93 }, sym: 72 },
      { id: 'cn-star-2', color: '#ffff00', shape: { kind: 'path', d: 'M-.6.8 0-1 .6.8-1-.3h2z', cx: 0, cy: -2.4, w: 48, h: 43.2, pre: 'scale(24)' }, target: { x: 285.6, y: 96.1, rot: -98.11 }, sym: 72 },
      { id: 'cn-star-3', color: '#ffff00', shape: { kind: 'path', d: 'M-.6.8 0-1 .6.8-1-.3h2z', cx: 0, cy: -2.4, w: 48, h: 43.2, pre: 'scale(24)' }, target: { x: 285.7, y: 167.3, rot: -74.04 }, sym: 72 },
      { id: 'cn-star-4', color: '#ffff00', shape: { kind: 'path', d: 'M-.6.8 0-1 .6.8-1-.3h2z', cx: 0, cy: -2.4, w: 48, h: 43.2, pre: 'scale(24)' }, target: { x: 238.1, y: 214.5, rot: -51.32 }, sym: 72 },
    ],
  },

  // ---- emblem flags (real extracted artwork) ----
  {
    id: 'cm', code: 'cm', name: 'Cameroon',
    blocks: [
      vstripe('cm-green', '#007a5e', 0),
      vstripe('cm-red', '#ce1126', 1),
      vstripe('cm-yellow', '#fcd116', 2),
      { id: 'cm-star', shape: { kind: 'image', href: cmStar, w: 119.2, h: 113.4 }, target: { x: 320, y: 239.8, rot: 0 }, sym: 72 },
    ],
  },
  {
    id: 'br', code: 'br', name: 'Brazil',
    blocks: [
      field('br-field', '#229e45'),
      { id: 'br-rhombus', color: '#f8e509', shape: { kind: 'path', d: 'm321.4 436 301.5-195.7L319.6 44 17.1 240.7z', cx: 320, cy: 240, w: 605.8, h: 392 }, target: { x: 320, y: 240, rot: 0 }, sym: 180 },
      { id: 'br-globe', shape: { kind: 'image', href: brGlobe, w: 254.8, h: 254.8 }, target: { x: 325.4, y: 239.9, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'es', code: 'es', name: 'Spain',
    blocks: [
      hband('es-red1', '#AA151B', 60, 120),
      hband('es-yellow', '#F1BF00', 240, 240),
      hband('es-red2', '#AA151B', 420, 120),
      { id: 'es-arms', shape: { kind: 'image', href: esArms, w: 181.3, h: 181.3 }, target: { x: 206.3, y: 240, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'pt', code: 'pt', name: 'Portugal',
    blocks: [
      vbar('pt-green', '#006600', 128, 256),
      vbar('pt-red', '#ff0000', 448, 384),
      { id: 'pt-emblem', shape: { kind: 'image', href: ptEmblem, w: 213.8, h: 214.7 }, target: { x: 255.9, y: 240.2, rot: 0 }, sym: 360 },
    ],
  },
  {
    id: 'kr', code: 'kr', name: 'South Korea',
    blocks: [
      field('kr-field', '#ffffff'),
      { id: 'kr-taegeuk', shape: { kind: 'image', href: krTaegeuk, w: 332.8, h: 332.8 }, target: { x: 319.7, y: 240.2, rot: 0 }, sym: 360 },
      { id: 'kr-trigrams', shape: { kind: 'image', href: krTrigrams, w: 507.5, h: 396.6 }, target: { x: 323.9, y: 241.6, rot: 0 }, sym: 360 },
    ],
  },
]
