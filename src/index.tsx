/* @refresh reload */
import { render } from 'solid-js/web'
import App from './components/App'
import { createConfig } from './config'
import { loadFonts } from './fonts'

(async () => {
  await loadFonts()

  const config = createConfig()
  config.load()

  render(() => <App config={config} />, document.getElementById('root')!)
})()
