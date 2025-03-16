
export interface FontDefinition {
  name: string
  size: string
  url: string
  lineHeight?: number
}

export const fonts: FontDefinition[] = [
  { name: 'm3x6', size: '16px', url: 'fonts/m3x6.woff2' },
  { name: 'm5x7', size: '16px', url: 'fonts/m5x7.woff2' },
  { name: 'ArkPixel Prop 10px', size: '10px', url: 'fonts/ark-pixel-10px-proportional-latin.woff2', lineHeight: 10 },
  { name: 'ArkPixel Mono 10px', size: '10px', url: 'fonts/ark-pixel-10px-monospaced-latin.woff2' },
  { name: 'ArkPixel Prop 12px', size: '12px', url: 'fonts/ark-pixel-12px-proportional-latin.woff2', lineHeight: 12 },
  { name: 'ArkPixel Mono 12px', size: '12px', url: 'fonts/ark-pixel-12px-monospaced-latin.woff2' },
  { name: 'ArkPixel Prop 16px', size: '16px', url: 'fonts/ark-pixel-16px-proportional-latin.woff2', lineHeight: 16 },
  { name: 'ArkPixel Mono 16px', size: '16px', url: 'fonts/ark-pixel-16px-monospaced-latin.woff2' },
  { name: 'BitstromWera Mono', size: '16px', url: 'fonts/BitstromWeraNerdFont-Regular.ttf' },
  { name: 'EnvyCodeR', size: '16px', url: 'fonts/EnvyCodeRNerdFont-Regular.ttf' },
  { name: 'Iosevka-ExtraLight 20px', size: '20px', url: 'fonts/Iosevka-ExtraLight.ttc', lineHeight: 18 },
  { name: 'Iosevka-ExtraLight 25px', size: '25px', url: 'fonts/Iosevka-ExtraLight.ttc', lineHeight: 24 },
  { name: 'Iosevka-ExtraLight 30px', size: '30px', url: 'fonts/Iosevka-ExtraLight.ttc', lineHeight: 28 },
]

export async function loadFonts(): Promise<void> {
  for (const def of fonts) {
    const { name, url } = def
    await loadFont(name, url)
  }
}

async function loadFont(fontFamily: string, url: string, props: FontFaceDescriptors = {
  style: 'normal',
  weight: '400',
}) {
  //const font = new FontFace(`'${fontFamily}'`, `url(${url})`, props)
  const font = new FontFace(fontFamily, `url(${url})`, props)
  await font.load()
  document.fonts.add(font)
}
