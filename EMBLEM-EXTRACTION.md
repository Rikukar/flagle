# Adding a flag with an emblem

Most flags are pure geometry (stripes, bars, crosses, discs) — those you author
directly in [`src/flags.js`](src/flags.js) with `rect` / `circle` blocks, no asset
needed. This doc is only for the ~60 flags that carry an **emblem** (coat of arms,
central device, complex symbol) that can't be drawn from a few shapes.

The rule of thumb:

| Emblem complexity | How to add it |
| --- | --- |
| Single solid-color shape (e.g. Canada's maple leaf) | Copy the `<path d="…">` into a `path` block. No asset file. |
| Anything multi-color / gradient (e.g. Mexico's coat of arms) | Extract it to `src/emblems/<code>.svg` and use an `image` block. Follow the 3 steps below. |

The emblem source is always the real flag from
`node_modules/flag-icons/flags/4x3/<code>.svg`, so the result is the genuine
artwork, never a hand-drawn replica.

---

## The 3-step process (multi-color emblems)

Worked example: Mexico (`mx`). Substitute the ISO 3166-1 alpha-2 code for other
countries.

### Step 1 — Extract the emblem into its own asset

Use [`scripts/extract-emblem.mjs`](scripts/extract-emblem.mjs). It keeps the
`<defs>` (gradients), drops the background elements you name, wraps the rest in a
`<g id="coa">`, and writes `src/emblems/<code>.svg`.

First open the source flag (`node_modules/flag-icons/flags/4x3/<code>.svg`) and
identify the **background** elements — the big full-height/full-width `<rect>` or
`<path>` fills near the top, before the emblem. Pass a regex matching each one as
an argument:

```sh
node scripts/extract-emblem.mjs mx \
  '<path fill="#ce1126"[^/]*/>' \
  '<path fill="#fff" d="M213\.3[^/]*/>' \
  '<path fill="#006847"[^/]*/>'
```

Each pattern is a JS regex *source string*; quote them for the shell. If you omit
the patterns the script still runs but leaves the background in — open the
generated file and delete those elements by hand.

The flag-icons coordinate space is always `640 x 480`, so the emblem keeps its
real position for now. We crop it in the next step.

### Step 2 — Find the emblem's true bounding box

The asset still has a full `640 x 480` viewBox with the emblem floating in the
middle, surrounded by empty space. We need the tight box so the block's hit-area
and rotation pivot are correct.

Easiest is to ask the browser. With the dev server running (`npm run dev`), paste
this in the browser console (or via the preview eval tool), pointing at your new
asset:

```js
const txt = await (await fetch('/src/emblems/mx.svg')).text();
const d = document.createElement('div');
d.style.cssText = 'position:absolute;left:-9999px';
d.innerHTML = txt;
document.body.appendChild(d);
const b = d.querySelector('#coa').getBBox();
console.log({ x: b.x, y: b.y, w: b.width, h: b.height,
             cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
d.remove();
```

For Mexico this returns `x 240.1, y 167.6, w 159.9, h 144.8` — and note
`cx 320, cy 240`, i.e. dead center of the flag, as expected.

Now crop the asset's viewBox to that box. Edit the top of `src/emblems/mx.svg`:

```diff
- viewBox="0 0 640 480"
+ viewBox="240.1 167.6 159.9 144.8"
```

(`viewBox="x y w h"` — the four numbers from the bbox.)

### Step 3 — Add the block to `src/flags.js`

Import the asset and add an `image` block. Its `w`/`h` are the bbox width/height
from step 2; its `target` is the emblem center `(cx, cy)`.

```js
import mxEmblem from './emblems/mx.svg'

// …inside FLAGS:
{
  id: 'mx',
  code: 'mx',
  name: 'Mexico',
  blocks: [
    vstripe('mx-green', '#006847', 0),
    vstripe('mx-white', '#ffffff', 1),
    vstripe('mx-red',   '#ce1126', 2),
    {
      id: 'mx-coa',
      shape: { kind: 'image', href: mxEmblem, w: 159.9, h: 144.8 },
      target: { x: 320, y: 240, rot: 0 },  // (cx, cy) from step 2
      sym: 360,                            // orientation matters for emblems
    },
  ],
},
```

That's it — the emblem now scatters, drags, rotates, snaps, and win-checks like
any other block.

---

## Notes & gotchas

- **`sym: 360` for emblems.** Emblems have a correct orientation, so the win-check
  requires the rotation to match (unlike a stripe, `sym: 180`, or a disc,
  `sym: 'full'`).
- **Get the official colors right** from the source SVG's `fill` attributes — never
  eyeball hex codes.
- **Hit-area is the bounding box.** An `image` block grabs pointer events across its
  full rectangle, including transparent corners. Fine for centered emblems; if two
  emblem boxes ever overlap it could feel sticky.
- **Single-color emblems skip all this.** Copy the `<path d="…">` straight into a
  `path` block with `cx`/`cy` set to the flag-space point that should sit at the
  block's center (see `ca-leaf` in `src/flags.js`). No asset, no cropping.
- **Re-running step 1** overwrites `src/emblems/<code>.svg`, which resets the
  viewBox — redo the step-2 crop afterward.
