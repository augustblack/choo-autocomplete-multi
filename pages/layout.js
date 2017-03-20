var html = require('bel')

var mainMenuView = require('./mainMenu')
var mainView = require('./main')

module.exports = function layout (pageView) {
  return function (state, emit) {
    return html`<div>
      ${mainMenuView(state, emit)}
      ${mainView(pageView(state, emit))}
    </div>`
  }
}
