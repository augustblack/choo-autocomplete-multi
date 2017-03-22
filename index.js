//var redirect = require('choo-redirect')
const choo = require('choo')
const html = require('bel')

const layout = require('./pages/layout')
const users = require('./pages/users')
const logs = require('./pages/logs')

const app = choo()

const usersPage = layout(users( app, {namespace:"users"} ))
const logsPage = layout(logs( app, {namespace:"logs"} ))

app.route("/", usersPage )
app.route("/users", usersPage )
app.route("/logs", logsPage)

const tree = app.start()
document.body.appendChild(tree)
