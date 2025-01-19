const path = require('path');

module.exports = {
  externalDeps: [
    'react',
    'react-router',
    'axios',
    'styled-components',
    'zustand',
    'zustand/middleware/immer',
  ],
  pluginRoot: path.resolve(__dirname, './web'),
  outDir: path.resolve(__dirname, '../../public'),
};
