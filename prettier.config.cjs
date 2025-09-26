const fs = require('fs');
const path = require('path');

const appConfigPath = path.resolve(__dirname, 'apps/web/.prettierrc');
const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
const pluginBase = path.resolve(__dirname, 'apps/web/node_modules');

module.exports = {
  ...appConfig,
  plugins: [
    require.resolve('prettier-plugin-svelte', { paths: [pluginBase] }),
    require.resolve('prettier-plugin-tailwindcss', { paths: [pluginBase] })
  ]
};
