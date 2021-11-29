const path = require('path');

module.exports = (env, argv) => ({
  mode: 'development',
  entry: {
    'index': ['./src/index.mjs'],
  },
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].mjs',
    library: 'SDK',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      use: [{
        loader: 'babel-loader',
      }]
    }]
  }
});
