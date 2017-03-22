const html = require('bel')
const {
  compose,
  identity,
  match,
  where
} = require('ramda')
const Task = require('ramda-fantasy').Future
const ac= require('../components/autocomplete')
const {nsify} = require('../utils')
const http = require('../utils/http')

const staticSugs = [
  {id:1, value:"hello"},
  {id:2, value:"blah"},
  {id:3, value:"blahblo"}
]

const gitMap = (body) => {
  const {total_count, items, incomplete_results} = body
  const results = items.map(r => { return { id: r.id, value: r.full_name } })
  const ret = {total:total_count, page:0, perPage:items.length, results}
  console.log("ret", ret)
  return ret
}


const fetchGithub = compose(
  http('get', {type: 'json'})('https://api.github.com/search/repositories'),
  ({term, page}) => { return {q: encodeURI(term), page} }
)

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
    }),
    ac(app,{
      namespace: nsify( namespace, "acgithub" ),
      fetchTask:fetchGithub,
      mapResults: gitMap
    })

  ]
  return (state, emit) => {
    //console.log("state", state)
    return html`<div>
    ${ components.map( c => c(state,emit) )}
    <div>pagination</div>
    <div>results</div>
    </div>
    `
  }
}
