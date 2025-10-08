
export interface FontDefinition {
  name: string
  size?: number
  url: string
  lineHeight?: number
  family?: string
}

export const fonts: FontDefinition[] = [
  { name: 'm3x6', size: 16, url: getFontUrl('m3x6.woff2') },
  { name: 'm5x7', size: 16, url: getFontUrl('m5x7.woff2') },
  { name: 'ArkPixel Prop 10px', size: 10, url: getFontUrl('ark-pixel-10px-proportional-latin.woff2') },
  { name: 'ArkPixel Prop 12px', size: 12, url: getFontUrl('ark-pixel-12px-proportional-latin.woff2') },
  { name: 'ArkPixel Prop 16px', size: 16, url: getFontUrl('ark-pixel-16px-proportional-latin.woff2') },
  { name: 'Iosevka-Thin', url: getFontUrl('IosevkaNerdFont-Thin.woff2') },
  { name: 'Iosevka-Regular', url: getFontUrl('IosevkaNerdFont-Regular.woff2') },
  { name: 'Iosevka-Heavy', url: getFontUrl('IosevkaNerdFont-Heavy.woff2') },
  { name: 'NotoSansDisplay-CondensedThin', url: getFontUrl('NotoSansDisplay-CondensedThin.woff2') },
  { name: 'NotoSansDisplay-CondensedLight', url: getFontUrl('NotoSansDisplay-CondensedLight.woff2') },
  { name: 'NotoSansDisplay-CondensedMedium', url: getFontUrl('NotoSansDisplay-CondensedMedium.woff2') },
  { name: 'NotoSansMono-CondensedThin', url: getFontUrl('NotoSansMono-CondensedThin.woff2') },
  { name: 'NotoSansMono-CondensedLight', url: getFontUrl('NotoSansMono-CondensedLight.woff2') },
  { name: 'NotoSansMono-CondensedMedium', url: getFontUrl('NotoSansMono-CondensedMedium.woff2') },
  { name: 'NotoSansMono-ExtraCondensedThin', url: getFontUrl('NotoSansMono-ExtraCondensedThin.woff2') },
  { name: 'NotoSansMono-ExtraCondensedLight', url: getFontUrl('NotoSansMono-ExtraCondensedLight.woff2') },
  { name: 'NotoSansMono-ExtraCondensedMedium', url: getFontUrl('NotoSansMono-ExtraCondensedMedium.woff2') },
]

function getFontUrl(name: string): string {
  return new URL(`../fonts/${name}`, import.meta.url).href
}

export async function loadFonts(): Promise<void> {
  for (const def of fonts) {
    def.family = def.name.replace(/\s+/g, '-')
    await loadFont(def.family, def.url)
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
