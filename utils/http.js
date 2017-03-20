const request = require('superagent')
const Task = require('ramda-fantasy').Future
const forEachObjIndexed  = require('ramda').forEachObjIndexed

const setOpts = xhr => forEachObjIndexed((value,key )=>{
  if (xhr && xhr[key])
    xhr[key](value)
})
// httpGet :: String -> Task Error ResponseJSON
module.exports = ( method, options ) => {
  const _method = method ? method.toLowerCase() : "get";
  const _opts = options || {}
  let _xhr=null; //hold on to last one

  return (url) => {
    return ( data) => {
      return new Task((reject, resolve) => {
        if ( _xhr && _xhr.abort){
          _xhr.abort()
        }
        _xhr=  request[_method](url)
        setOpts(_xhr)(_opts)
        if (data) {
          if (_method==="get") {
            _xhr.query(data)
          }
          else if (_method==="post" || _method==="put"){
            _xhr.send(data)
          }
        }
        _xhr.end( (err,res)=>{
          if (err || !res.ok) {
            return reject( (res && res.body && res.body.error ) ? res.body.error : err)
          }
          return resolve(res)
        })
      })
    }
  }
}

/*
const httpGetPlain = http("get", {type:"html"})
const httpPost = http("post")

// example: call multiple times
const task = httpGetPlain("http://cnn.com")( )
task.fork( x=>console.error("err", arguments ), res=> console.log("gotit", JSON.stringify(res.text.slice(0,30)) ) )
task.fork( x=>console.error("err", arguments ), res=> console.log("gotit", JSON.stringify(res.text.slice(0,30)) ) )
setTimeout( ()=>{
  task.fork( x=>console.error("err", arguments ), res=> console.log("gotit", JSON.stringify(res.text.slice(0,30)) ) )
}, 1000)
*/
