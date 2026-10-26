import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  // Replace this with the appName registered in the Apps in Toss console.
  appName: 'stock-bite',
  brand: { primaryColor: '#3182F6' },
  webView: {},
  permissions: [],
  webBundleDir: 'dist',
})
