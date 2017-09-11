const Queue = require('./queue')

const q = new Queue(2)

const log = v => console.log(v)

const createTask = (name, duration = 1) => () => new Promise((res) => {
  log(`task ${name} started`)
  setTimeout(() => {
    res(`task ${name} finished`)
  }, duration * 1000)
})

                                 // E  R
q.schedule(createTask('A', 2))   // 3  3
q.schedule(createTask('B', 1))   // 1  1
q.schedule(createTask('C', 0.5)) // 2  2
q.schedule(createTask('D', 2))   // 4  4

q.subscribe((err, v) => {
  log(v)
})
