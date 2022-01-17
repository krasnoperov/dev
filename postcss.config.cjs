// TODO: migrate back to ESM: https://github.com/davidtheclark/cosmiconfig/issues/224
const autoprefixer = require('autoprefixer')

module.exports = ({ }) => ({
  plugins: [
    autoprefixer(),
  ],
})
