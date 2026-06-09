// Resolve each flag-icons SVG to a real bundled URL so we can render it as an
// <img> and preload it during play (avoids the on-demand fetch delay that the
// CSS background-image approach had on the score screen).
const modules = import.meta.glob('../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const FLAG_URLS = {}
for (const [path, url] of Object.entries(modules)) {
  const code = path.split('/').pop().replace('.svg', '')
  FLAG_URLS[code] = url
}

export const flagUrl = (code) => FLAG_URLS[code]
