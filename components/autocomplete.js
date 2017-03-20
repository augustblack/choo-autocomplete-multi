const html = require( 'bel' )
const request = require( 'superagent')
const css = require('sheetify')

const {
  eqProps,
  uniqWith,
  differenceWith,
  concat,
  compose,
  map,
  tap,
  merge
} = require('ramda')

const http = require('../utils/http')
const { nsify, debounce } = require('../utils')

const uniqById = uniqWith(eqProps('id'))
const differenceById = differenceWith(eqProps('id'))

const fetchGithub= compose(
  http("get", {type:"json"})( "https://api.github.com/search/repositories") ,
  ({term,page})  => {return {q:encodeURI(term),page} }
)
const fetchWord= compose(
  http("get", {type:"json"})("http://localhost:3000/word"),
  ({term,page})  => {return {term,page} }
)

const UP_KEYCODE = 38
const DOWN_KEYCODE = 40
const ENTER_KEYCODE = 13
const TAB_KEYCODE = 9
const DELETE_KEYCODE = 46

const defaultMapResults = (body) =>{
  const {total,page,perPage} =body
  const results = body.results.map( r=>{return { id:r,value:r } })
  return {total,page,perPage,results}
}

const removeSelReducer = (data)=> (acc,i)=>{
  if (i.id!==data.id) acc.push(i)
    return acc;
}
const debounce300 =debounce(300)

const testdata =[
  {id:"w",value:"w"},
  {id:"wa",value:"wa"},
  {id:"wah",value:"wah"},
  {id:"waht",value:"waht"},
  {id:"wahtt",value:"wahtt"},
  {id:"wahtth",value:"wahtth"},
  {id:"wahtthefuck",value:"wahtthefuck"},
]
const defaultState  = {
  term:'',
  page:0,
  perPage:10,
  total:0,
  highlighted:-1,
  loading:false,
  suggestions: [],
  selections: []
}

module.exports = (app, {
  namespace=new Date().getTime(),
  initialState=defaultState,
  fetchTask=fetchWord,
  mapResults=defaultMapResults,
  suggestionView= (sug)=> sug.value,
  selectionView= (sel)=> sel.value,
}) => {

  const sym = ([
    "fetchSugggestions",
    "setState",
    "clearSuggestions",
    "addToSelections",
    "removeFromSelections",
    "moveHighlight",
    "setHighlight",
    "takeHighlighted",
    "setFetched",
    "fetchSugggestions",
    "fetchMore",
    "errorOnFetch",
    "acinput"
  ])
  .reduce( (obj,v)=> {obj[v]= nsify(namespace,v );return obj},{})

  const acstyle = css`
    :host {
      max-width: 30rem;
      border: 1px solid grey;
      padding: 0.25rem;
      margin: 0.5rem;
      position: relative;
      cursor: text;
    }
    :host .suggestion, .selection{
      list-style-type: none;
    }
    :host .suggestion, .suggestionsMore{
      padding:0.25rem;
      border-top: 1px solid #ccc;
      cursor: pointer;
    }
    :host .suggestions {
      margin:0rem;
      padding: 0rem;
      padding-top: 0.25rem;
      overflow: scroll;
      max-height: 200px;
      position: absolute;
      left: -1px;
      background: white;
      width: 100%;
      border-bottom: 1px solid grey;
      border-left: 1px solid grey;
      border-right: 1px solid grey;
    }
    :host .selections {
      display: inline-block;
      margin: 0rem;
      padding: 0rem;
    }
    :host .selection {
      display: inline-block;
      margin: 0.2rem;
      padding: 0.4rem;
      border-radius: 0.2rem;
      background: #c7c5c5;
      padding-right: 0px;
    }
    :host .selections .selection .delete {
      margin: 0.2rem;
      padding: 0.2rem;
      border-radius: 0.2rem;
      background: #a2a2a2;
      color: #5f5f5f;
      cursor: pointer;
      margin-right: 0px;
    }
    :host .acinput {
      margin: 0.25rem;
      padding: 0.25rem;
      font-size: 1rem;
      border: 0rem;
    }
    :host .acinput:focus {
      outline: none;
    }
    :host .highlighted {
      background:green;
    }
    `

    const emptySuggestions = {
      loading:false,
      page:0,
      total:0,
      suggestions:[]
    }

    app.use( (state,bus) => {
      state[namespace] = merge(state[namespace], initialState)
      bus.on('DOMContentLoaded', function () {
        bus.on(sym.setState, setState),
        bus.on(sym.clearSuggestions, ()=>setState(emptySuggestions)),
          bus.on(sym.addToSelections, addToSelections)
          bus.on(sym.removeFromSelections, removeFromSelections)
          bus.on(sym.moveHighlight,  moveHighlight)
          bus.on(sym.setHighlight, setHighlight )
          bus.on(sym.takeHighlighted, takeHighlighted )
          bus.on(sym.setFetched, setFetched )
          bus.on(sym.fetchSugggestions,  fetchSugggestions)
          bus.on(sym.fetchMore,  fetchMore)
      })
      const setState = (data) => {
        state[namespace] = merge(state[namespace],data)
        bus.emit("render")
      }

      const addToSelections = (sel) => {
        const selections = uniqById(concat(state[namespace].selections, [sel]))
        return setState(merge({term:'',selections,highlighted:-1}, emptySuggestions ))
      }
      const removeFromSelections = (data) => {
        const selections = state[namespace].selections
        .reduce( removeSelReducer(data), [])
        return setState({selections})
      }
      const moveHighlight = (val) =>{
        let highlighted = state[namespace].highlighted + val
        if (highlighted < -1) highlighted=-1;
        else if (highlighted > state[namespace].suggestions.length -1) highlighted=state[namespace].suggestions.length-1
          return setState({ highlighted})
      }
      const setHighlight = ( idx) =>{
        return setState({ highlighted: idx})
      }
      const takeHighlighted = (val) => {
        const s=state[namespace]
        if (s.highlighted < 0 || s.highlighted > s.suggestions.length-1) return;
        const word = s.suggestions[s.highlighted]
        const selections = uniqById(concat(s.selections, [word]))
        return setState( merge({ term:'',highlighted: -1, selections}, emptySuggestions ) )
      }
      const setFetched = (body) =>{
        const s=state[namespace]
        const {total,page, perPage,results} = mapResults(body)
        if (page===0) {
          const suggestions = differenceById(results , s.selections)
          return setState({loading:false, page,total,perPage, suggestions})
        }
        else {
          const suggestions = differenceById(concat(s.suggestions,results) , s.selections)
          return setState({loading:false, page,total,perPage, suggestions} )
        }
      }
      const fetchSugggestions = ( term ) => {
        if (!term || term.length <1) {
          return setState(merge({term:''}, emptySuggestions))
        }
        setState({term,loading:true, page:0, total:0,suggestions:[]})
        fetchTask({term, page:1})
        .fork( err=> bus.emit(sym.errorOnFetch, err), res=> setFetched(res.body || {}))
      }
      const fetchMore = () => {
        const s =state[namespace]
        if (!s.term || s.term.length <1) {
          return setState(emptySuggestions )
        }
        setState({loading:true})
        fetchTask({term:s.term, page:s.page+1})
        .fork( err=> bus.emit(sym.errorOnFetch, err), res=> setFetched(res.body || {}))
      }

    })

    return (state, emit) => {
      const debouncedInput = (emit, sym) => debounce300( (e) => emit( sym.fetchSugggestions , e.target.value ) )

      const selection= (sel, emit) => html`<li class="selection" >${selectionView(sel)}
        <span class="delete"
        onmousedown=${(e)=> emit(sym.removeFromSelections, sel)}>x</span>
        </li>`
      const selections = ( sels, emit) => html`<ul class="selections">${sels.map( s => selection(s,emit)) }</ul>`
      const showMore = (state,emit)=> {
        if( ( state.page+1)*state.perPage < state.total )
          return html`<li class="suggestion" onmousedown=${ e=>{e.preventDefault(); emit(sym.fetchMore)}}>Show more....${ state.loading ? "loading":"" }</li>`
        return html``
      }

      const suggestion = (sug , hi ,idx, emit) => html`<li
      id=${"suggestion_"+sug.id}
      class="suggestion ${hi ? 'highlighted':'' }"
      onmousedown=${ e=>{e.preventDefault(); emit(sym.addToSelections,sug) }}
      onmouseover=${ e=>{emit(sym.setHighlight, idx) }}
      >${suggestionView(sug)}</li>`

      const suggestions = (state, emit) =>{
        if (state.loading && state.suggestions.length===0) {
          return html`<div class="container"><ul class="suggestions" id="suggestions"><li>loading... </li></ul></div>`
        }
        return html`<div class="container">
        <ul class="suggestions" id="suggestions">
        ${state.suggestions.map( (s,idx) => suggestion(s, (state.highlighted===idx), idx, emit)) }
        ${showMore(state,emit)}
        </ul></div>`
      }

      const handleKeyDown = (e)=>{
        switch(e.keyCode) {
          case UP_KEYCODE:
            emit( sym.moveHighlight, -1)
            e.preventDefault()
            break;
          case DOWN_KEYCODE:
            e.preventDefault()
            emit(sym.moveHighlight,1)
            break;
          case ENTER_KEYCODE:
            emit(sym.takeHighlighted)
            break;
          case TAB_KEYCODE:
            e.preventDefault()
            emit(sym.takeHighlighted)
            break;
          case DELETE_KEYCODE:
            break;
        }
      }

      return html`
      <div
        class="${acstyle}"
        style="${ state[namespace].suggestions.length ? 'z-index:99;':'z-index:1;' }"
        id="${nsify(namespace,'main')}"
        onmouseup=${e=> document.querySelector('#' + sym.acinput ).focus() }>
      ${selections(state[namespace].selections, emit)}
      <input
      value=${state[namespace].term}
      id=${sym.acinput}
      class="acinput"
      type="text"
      onblur=${(e) => emit(sym.clearSuggestions ) }
      oninput=${debouncedInput(emit,sym) }
      onkeydown=${ handleKeyDown}
      />
      ${suggestions(state[namespace], emit)}
      </div>
      `
    }
}
/*
   const choo = require('choo')
   const app = choo()
   app.use(getStore("ac1", {}))
   app.route('/', getView("ac1") )
   app.mount('body')
   */

