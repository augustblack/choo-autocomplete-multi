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

const gitMap = (res) => {
  if (!(res && res.body) ) {
    return {total:0,page:0, perPage:10,results:[]}
  }
  const pageReg = /.*=(\d*)$/
  const {total_count, items, incomplete_results} = res.body
  const results = items.map(r => { return { id: r.id, value: r.full_name } })
  // need to parse out the page from the initial request, lame :(
  const page = parseInt(pageReg.exec(( res.req && res.req.url ) ? res.req.url : "=0")[1])
  const ret = {total:total_count, page, perPage:items.length, results}
  return ret
}


const fetchGithub = compose(
  http('get', {type: 'json'})('https://api.github.com/search/repositories'),
  ({term, page}) => { return {q: encodeURI(term), page} }
)

const fetchWord = compose(
  http('get', {type: 'json'})('http://localhost:3000/word'),
  ({term, page}) => { return {term, page} }
)


const fetchStatic = (x) => new Task( (reject, resolve) =>{
  const reg =new RegExp("^"+x.term, "i")
  const results = staticSugs.filter( s=> s.value.match(reg)!==null)
  resolve({
    page:0,
    total: results.length,
    perPage: results.length,
    results,
  } )
})

module.exports = (app,{
  namespace=new Date().getTime(),
  initialState={},
})=>{

  const components= [
    {
      namespace: nsify( namespace, "ac_words" ),
      fetchTask: fetchWord
    },
    {
      namespace: nsify( namespace, "ac_static" ),
      fetchTask: fetchStatic,
      mapResults:identity
    },
    {
      namespace: nsify( namespace, "ac_github" ),
      fetchTask:fetchGithub,
      mapResults: gitMap
    }
  ].map( c=> ac(app, c))

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
