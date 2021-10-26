const path = require('path');

module.exports = (env, argv) => ({
  mode: 'development',
  entry: {
    'index': ['./src/index.js'],
  },
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
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
