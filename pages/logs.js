const html = require('bel')
const {
  identity,
  match,
  where
} = require('ramda')
const Task = require('ramda-fantasy').Future
const ac= require('../components/autocomplete')
const {nsify} = require('../utils')

const staticSugs = [
  {id:1, value:"hello"},
  {id:2, value:"blah"},
  {id:3, value:"blahblo"}
]

const fetchTask = (x) => new Task( (reject, resolve) =>{
  const reg =new RegExp("^"+x.term, "i")
  const results = staticSugs.filter( s=> s.value.match(reg)!==null)
  resolve({
    body: {
    page:0,
    total: results.length,
    perPage: results.length,
    results,
  } })
})

module.exports = (app,{
  namespace=new Date().getTime(),
    defaultState={},
})=>{

  const components= [
    ac(app,{namespace: nsify( namespace, "ac1" )}),
    ac(app,{
      namespace: nsify( namespace, "ac2" ),
      fetchTask,
      mapResults:identity
    })
  ]
  return (state, emit) => {
    //console.log("state", state)
    return html`<div>
    ${ components[0](state,emit) }
    ${ components[1](state,emit) }
    <div>pagination</div>
    <div>results</div>
    </div>
    `
  }
}
