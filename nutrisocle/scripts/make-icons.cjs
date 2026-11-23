// Génère les icônes PNG de l'app à partir d'un dessin SVG (utilise le Chromium installé).
const { chromium } = require('playwright')
const path = require('path')
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
<rect width="64" height="64" fill="#FFF9F3"/>
<g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})">
<rect x="21" y="12" width="22" height="12" rx="5" fill="#F08A4B"/><rect x="13" y="27" width="38" height="12" rx="5" fill="#5FA585"/><rect x="5" y="42" width="54" height="12" rx="5" fill="#2F7A5F"/></g></svg>`
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const out = [['icon-192.png', 192, 4], ['icon-512.png', 512, 4], ['icon-maskable-512.png', 512, 12], ['apple-touch-icon.png', 180, 6]]
  for (const [name, size, pad] of out) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<html><body style="margin:0">${svg(pad)}</body></html>`)
    await page.screenshot({ path: path.join(__dirname, '..', 'public', name), omitBackground: false })
  }
  await browser.close()
})()
