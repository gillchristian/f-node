const path = require('path')
const { promisify } = require('util')
const fs = require('fs')

const Queue = require('./queue')

const filesQueue = new Queue(180)

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const readfile = promisify(fs.readFile)

module.exports = main

function main () {
  const args = process.argv.slice(2)
  const query = args[0]
  const roots = args.slice(1)

  if (args.length === 0) {
    console.log('no arguments')
    return 
  }
  if (roots.length === 0) {
    roots[0] = '.'
  }

  const started = Date.now()
  const results = { matched: 0, total: 0 }

  roots.forEach(walkDir(query))

  filesQueue.subscribe((err, result) => {
    results.matched += result.matched
    results.total += result.total
  })

  filesQueue.handleDone(() => {
    console.log(`Found ${results.matched} matches in ${results.total} files`)
    console.log(`Took ${(Date.now() - started)/1000}s.`)
  })
}

function count(acc, cur) {
  return { 
    matched: acc.matched + cur.matched,
    total: acc.total + cur.total,
  }
}

// fileAndStats :: String -> Promise({ name: String, isDir: Bool, isFile: Bool })
function fileAndStats(name) {
  return stat(name)
  .then(stats => ({ name, isDir: stats.isDirectory(), isFile: stats.isFile() }))
}

// prop :: String -> { String: a } -> a
function prop(name) {
  return x => x[name] 
}

// map :: (a -> b) -> [a] -> [b]
function map(f) {
  return xs => xs.map(x => f(x))
}

// filter :: (a -> Bool) -> [a] -> [a]
function filter(f) {
  return xs => xs.filter(x => f(x))
}

// reduce :: (b -> a -> b) -> b -> [a] -> b
function reduce(f, d) {
  return xs => xs.reduce((acc, cur) => f(acc, cur), d)
}

// checkFile :: String -> String -> { matched: 0|1, total: 0|1 }
function checkFile(query) {
  return (file) => readfile(file, 'utf-8')
  .then(content => content.includes(query) 
    ? (console.log(file), { matched: 1, total: 1 }) // ¯\_(ツ)_/¯
    : { matched: 0, total: 1 }
  )
  .catch(err => {
    console.log('Error opening file', err)
    return { matched: 0, total: 0 }
  })
  
}

// walkDir :: String -> String -> Promise({ matched: Int, total: Int })
function walkDir(query) {
  return (dir) =>  {
    readdir(dir)
    .catch((err) => {
      console.error('Error walking directory')
      console.error(err)
      return []
    })
    .then(map(file => path.join(dir, file)))
    .then(map(fileAndStats))
    .then(ps => Promise.all(ps))
    .then(filter(f => prop('isDir')(f) || prop('isFile')(f)))
    .then(map(f => {
      const name = prop('name')(f)
      if (prop('isDir')(f)) {
        walkDir(query)(name)
      } else {
        filesQueue.schedule(() => checkFile(query)(name))
      }
    }))
  }
}
