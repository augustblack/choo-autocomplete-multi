var html = require('choo/html')

const model = {
	namespace: "logs",
  state: {
    items: []
  },
  reducers: {
    receiveTodos: (state, data) => {
      return { tasks: data }
    },
    receiveNewTodo: (state, data) => {
      return { tasks: state.tasks.slice().concat(data)}
    },
    replaceTodo: (state, data) => {
      const newTodos = state.tasks.slice()
      newTodos[data.index] = data.todo
      return { tasks: newTodos }
    }
  },
  effects: {
    getTodos: (state, data, send, done) => {
      store.getAll('tasks', (tasks) => {
        send('todos:receiveTodos', tasks, done)
      })
    },
		addTodo: (state, data, send, done) => {
			console.log("addTodo", state)
      const todo = extend(data, {
        completed: false
      })

      store.add('tasks', todo, () => {
        send('todos:receiveNewTodo', todo, done)
      })
    },
    updateTodo: (state, data, send, done) => {
      const oldTodo = state.tasks[data.index]
      const newTodo = extend(oldTodo, data.updates)

      store.replace('tasks', data.index, newTodo, () => {
        send('todos:replaceTodo', { index: data.index, todo: newTodo }, done)
      })
    }
  }
}


module.exports = function (page) {
  return html`
    <div>
    logs
    </div>`
}
