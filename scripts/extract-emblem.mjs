// Extract a flag emblem from flag-icons into a standalone SVG asset.
//
// Usage:  node scripts/extract-emblem.mjs <code> [bgPattern1] [bgPattern2] ...
//
//   <code>        ISO 3166-1 alpha-2 country code (e.g. "mx")
//   bgPatternN    optional regex source(s) matching the BACKGROUND elements to
//                 drop (stripes/fields). If omitted you'll likely need to edit
//                 the generated file by hand — open the source SVG and remove the
//                 big full-size <rect>/<path> fills near the top.
//
// After running, see EMBLEM-EXTRACTION.md steps 2 & 3 (find bbox, crop viewBox,
// add the block to src/flags.js).

import fs from 'fs';

const [code, ...bgPatterns] = process.argv.slice(2);
if (!code) {
  console.error('usage: node scripts/extract-emblem.mjs <code> [bgPattern ...]');
  process.exit(1);
}

const srcPath = `node_modules/flag-icons/flags/4x3/${code}.svg`;
const src = fs.readFileSync(srcPath, 'utf8');

const defsMatch = src.match(/<defs>[\s\S]*?<\/defs>/);
const defs = defsMatch ? defsMatch[0] : '';

let body = src.replace(/<defs>[\s\S]*?<\/defs>/, '');
for (const p of bgPatterns) {
  body = body.replace(new RegExp(p), '');
}
body = body.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();

const out =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
  `viewBox="0 0 640 480">${defs}<g id="coa">${body}</g></svg>`;

fs.mkdirSync('src/emblems', { recursive: true });
const outPath = `src/emblems/${code}.svg`;
fs.writeFileSync(outPath, out);

console.log(`wrote ${outPath} (${out.length} bytes)`);
if (!bgPatterns.length) {
  console.log('NOTE: no background patterns given — open the file and remove the');
  console.log('      stripe/field elements manually, then crop the viewBox (step 2).');
}
