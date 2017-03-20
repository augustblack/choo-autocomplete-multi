const choo = require('choo')
const html = require('bel')

module.exports = function (state, emit) {
  return html`
    <ul>
      <li><a href="/users">users</a></li>
      <li><a href="/logs">logs</a></li>
    </ul>`
}


