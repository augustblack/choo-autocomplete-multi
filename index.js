//var redirect = require('choo-redirect')
const choo = require('choo')
const html = require('bel')

const layout = require('./pages/layout')
const users = require('./pages/users')
const logs = require('./pages/logs')

const app = choo()

const usersC  = users( app, {namespace:"users"} )
const logsC = logs( app, {namespace:"logs"} )

const usersPage = layout( usersC )
const logsPage = layout( logsC )

app.route("/", usersPage )
app.route("/users", usersPage )
app.route("/logs", logsPage)

/*
//['/', redirect( '/users') ],
([
  ['/', layout(users.getView("users"))],
]).forEach( (r)=>{
  app.route(r[0], r[1])
})
*/

const tree = app.start()
document.body.appendChild(tree)
