const STATE_KEY = 'pp6_state'

export const state = {
  font: 'ArkPixel Prop 12px',
  text: '',
  padding: 3,
  layout: 'vertical',
  debug: false,
  preview: false,
  monochromeThreshold: 128,
}

export function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STATE_KEY))
    Object.assign(state, data)
  } catch (e) {
    console.error(`failed to load state: ${e}`)
  }
}
