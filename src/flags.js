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
// All five flags below are fully geometric, so they render 100% accurately
// from this data — no hand-drawn approximations.

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
]
