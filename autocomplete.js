const choo = require('choo')
const html = require( 'choo/html' )
const request = require( 'superagent')
const css = require('sheetify')

const eqProps = require('ramda').eqProps
const uniqWith = require('ramda').uniqWith
const differenceWith = require('ramda').differenceWith
const concat = require('ramda').concat
const mergeAll= require('ramda').mergeAll
const merge= require('ramda').merge

const http = require('./http')
const app = choo()

const uniqById = uniqWith(eqProps('id'))
const differenceById = differenceWith(eqProps('id'))

const fetchWord= http("get", {type:"json"})("http://localhost:3000/word")

const defaultMapResults = (body) =>{
  const {total,page,perPage} =body
  const results = body.results.map( r=>{return { id:r,value:r } })
  return {total,page,perPage,results}
}

const removeSelReducer = (data)=> (acc,i)=>{
  if (i.id!==data.id) acc.push(i)
  return acc;
}
const debounce = (wait) => (func, immediate) =>{
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};
const debounce300 =debounce(300)
const debouncedInput = (send) => debounce300( (e) => send('fetchSugggestions', e.target.value ) )

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
const clearSuggestions = () =>{
  return {
    loading:false,
    page:0,
    total:0,
    suggestions:[]
  }
}

app.model({
  state: {
    term:'',
    page:0,
    perPage:10,
    total:0,
    highlighted:-1,
    loading:false,
    suggestions: [],
    selections: []
  },
  reducers: {
    setState: (state,data) =>{
      return merge(state,data)
    },
    clearSuggestions: (state, data) =>{
      return merge(state, clearSuggestions())
    },
    addToSelections: (state, sel) =>{
      const selections = uniqById(concat(state.selections, [sel]))
      document.querySelector('#acinput').value="";
      return mergeAll([state,{selections,highlighted:-1}, clearSuggestions()])
    },
    removeFromSelections: (state,data) => {
      const selections = state.selections
      .reduce( removeSelReducer(data), [])
      return merge(state,{selections})
    },
    moveHighlight: (state, val) =>{
      let highlighted = state.highlighted + val
      if (highlighted < -1) highlighted=-1;
      else if (highlighted > state.suggestions.length -1) highlighted=state.suggestions.length-1
      return merge(state,{ highlighted})
    },
    setHighlight: (state, idx) =>{
      return merge(state,{ highlighted: idx})
    },
    takeHighlighted:(state, val, send) => {
      if (state.highlighted < 0 || state.highlighted > state.suggestions.length-1) return;
      const word = state.suggestions[state.highlighted]
      const selections = uniqById(concat(state.selections, [word]))
      document.querySelector('#acinput').value="";
      return mergeAll([state,{ highlighted: -1, selections}, clearSuggestions()])
    },
    setFetched: (state, body) =>{
      const {total,page, perPage,results} = defaultMapResults(body)
      if (page===0) {
        const suggestions = differenceById(results , state.selections)
        return merge(state,{loading:false, page,total,perPage, suggestions})
      }
      else {
        const suggestions = differenceById(concat(state.suggestions,results) , state.selections)
        return merge(state,{loading:false, page,total,perPage, suggestions} )
      }
    },
  },
  effects: {
    fetchSugggestions: (state, term, send, done) => {
      if (!term || term.length <1) {
       return send('clearSuggestions', {} , done)
      }
      send('setState', {term,loading:true, page:0, total:0,suggestions:[]}, (err,value)=>{
        if (err) return done(err)
        fetchWord({term})
        .fork( done, res=> send('setFetched', res.body || {}, done ))
      })
    },
    fetchMore: (state, term, send, done) => {
      if (state.term.length <1) {
       return send('clearSuggestions', {} , done)
      }
      send('setState', {loading:true}, (err,value)=>{
        fetchWord({term:state.term, page:state.page+1})
        .fork( done, res=> send('setFetched', res.body || {}, done ))
      })
    },

  }
})


const selection= (sel, send) => html`<li class="selection" >${sel.value} <span class="delete" onmousedown=${(e)=> send('removeFromSelections', sel)}>x</span></li>`
const selections = ( sels, send) => html`<ul class="selections">${sels.map( s => selection(s,send)) }</ul>`
const showMore = (state,send)=> {
  if( ( state.page+1)*state.perPage < state.total )
    return html`<li class="suggestion" onmousedown=${ e=>{e.preventDefault(); send('fetchMore',{})}}>Show more....${ state.loading ? "loading":"" }</li>`
  return html``
}

const suggestion = (sug , hi ,idx, send) => html`<li
id=${"suggestion_"+sug.id}
class="suggestion ${hi ? 'highlighted':'' }"
onmousedown=${ e=>{e.preventDefault(); send('addToSelections',sug) }}
onmouseover=${ e=>{send('setHighlight', idx) }}
>${sug.value}</li>`

const suggestions = (state, send) =>{
  if (state.loading && state.suggestions.length===0) {
   return html`<div class="container" id="suggestions_container"><ul class="suggestions" id="suggestions"><li>loading... </li></ul></div>`
  }
  return html`<div class="container" id="suggestions_container">
  <ul class="suggestions" id="suggestions">
  ${state.suggestions.map( (s,idx) => suggestion(s, (state.highlighted===idx), idx, send)) }
  ${showMore(state,send)}
  </ul></div>`
}

const UP_KEYCODE = 38
const DOWN_KEYCODE = 40
const ENTER_KEYCODE = 13
const TAB_KEYCODE = 9
const DELETE_KEYCODE = 46

const mainView = (state, prev, send) => {

  const handleKeyDown = (e)=>{
    switch(e.keyCode) {
      case UP_KEYCODE:
        send("moveHighlight", -1)
        e.preventDefault()
        break;
      case DOWN_KEYCODE:
        e.preventDefault()
        send("moveHighlight",1)
        break;
      case ENTER_KEYCODE:
        send("takeHighlighted")
        break;
      case TAB_KEYCODE:
        e.preventDefault()
        send("takeHighlighted")
        break;
      case DELETE_KEYCODE:
        break;
    }
  }

  return html`
  <div class="${acstyle}" id="main" onmouseup=${e=> document.querySelector('#acinput').focus() }>
  ${selections(state.selections, send)}
  <input
  id="acinput"
  class="acinput"
  type="text"
  oninput=${ debouncedInput(send) }
  onblur=${(e) => send('clearSuggestions', {} ) }
  onkeydown=${ handleKeyDown}
  />
  ${suggestions(state, send)}
  </div>
  `
}
app.router(
  ['/', mainView]
)

const tree = app.start()
document.body.appendChild(tree)
