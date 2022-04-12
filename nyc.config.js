module.exports = {
  extension: '.mjs',
  exclude: [
    'hardhat.config.js',
  ],
  reporter: [
    // for development
    'text',
    // for CI
    'lcov',
    'clover',
  ],
};
