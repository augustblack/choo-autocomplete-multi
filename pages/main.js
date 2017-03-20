var html = require('bel')

module.exports = function (page) {
  return html`<div class="container">
      ${page}
    </div>`
}
