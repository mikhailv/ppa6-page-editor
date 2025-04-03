
export interface FontDefinition {
  name: string
  size: string
  url: string
  lineHeight?: number
  family?: string
}

export const fonts: FontDefinition[] = [
  { name: 'm3x6', size: '16px', url: getFontUrl('m3x6.woff2') },
  { name: 'm5x7', size: '16px', url: getFontUrl('m5x7.woff2') },
  { name: 'ArkPixel Prop 10px', size: '10px', url: getFontUrl('ark-pixel-10px-proportional-latin.woff2') },
  { name: 'ArkPixel Prop 12px', size: '12px', url: getFontUrl('ark-pixel-12px-proportional-latin.woff2') },
  { name: 'ArkPixel Prop 16px', size: '16px', url: getFontUrl('ark-pixel-16px-proportional-latin.woff2') },
  { name: 'Iosevka-Thin 25px', size: '25px', url: getFontUrl('IosevkaNerdFont-Thin.woff2') },
  { name: 'Iosevka-Light 25px', size: '25px', url: getFontUrl('IosevkaNerdFont-Light.woff2') },
  { name: 'Iosevka-Regular 25px', size: '25px', url: getFontUrl('IosevkaNerdFont-Regular.woff2') },
  { name: 'Iosevka-Heavy 25px', size: '25px', url: getFontUrl('IosevkaNerdFont-Heavy.woff2') },
]

function getFontUrl(name: string): string {
  return new URL(`../fonts/${name}`, import.meta.url).href
}

export async function loadFonts(): Promise<void> {
  const families: Record<string, string> = {}
  for (const def of fonts) {
    families[def.url] = def.url.replace(/\/([-\w]+?)\.\w+$/, '$1')
  }
  for (const [url, family] of Object.entries(families)) {
    await loadFont(family, url)
  }
  for (const def of fonts) {
    def.family = families[def.url]
  }
}

async function loadFont(fontFamily: string, url: string, props: FontFaceDescriptors = {
  style: 'normal',
  weight: '400',
}) {
  const font = new FontFace(fontFamily, `url(${url})`, props)
  await font.load()
  document.fonts.add(font)
}
