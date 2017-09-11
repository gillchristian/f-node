class Queue {
  constructor(cap) {
    this.cap = cap
    this.activeTasks = 0
    this.queue = []
    this.handlers = []
  }

  schedule(fn){
    this.queue = [...this.queue, fn]

    this.runNext()
  }

  isDone() {
    return this.activeTasks === 0
  }

  isBusy() {
    return this.activeTasks >= this.cap
  }

  hasPending() {
    return this.queue.length > 0
  }

  runNext() {
    if (!this.isBusy() && this.hasPending()) {
      const next = this.queue[0]
      this.queue = this.queue.slice(1)
      this.run(next)
    } else if (this.isDone()) {
      this.doneHandler && this.doneHandler()
    }
  }

  run(fn) {
    this.activeTasks = this.activeTasks + 1

    fn()
    .then((v) => {
      this.activeTasks = this.activeTasks - 1
      this.runNext()
      this.runHandlers(v, true)
    })
    .catch(err => {
      this.activeTasks = this.activeTasks - 1
      this.runNext()
      this.runHandlers(err, false)
    })
  }

  subscribe(fn) {
    this.handlers = [...this.handlers, fn]
  }

  runHandlers(value, ok) {
    this.handlers.forEach(fn => {
      ok ? fn(null, value) : fn(value)
    })
  }
  
  handleDone(fn) {
    this.doneHandler = fn
  }
}

module.exports = Queue
