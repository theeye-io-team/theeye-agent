
const debug = require('debug')('eye:agent:main:error')
const envset = require('./environment')
envset()
  .then(() => {
    process.on('SIGINT', () => {
      debug('agent process ends on "SIGINT"')
      process.exit(0)
    })
    process.on('SIGTERM', () => {
      debug('agent process ends on "SIGTERM"')
      process.exit(0)
    })
    process.on('exit', () => { // always that the process ends, throws this event
      debug('agent process ends on "process.exit"')
      process.exit(0)
    })
    process.on('uncaughtException', (err) => {
      debug('agent process on "uncaughtException"')
      debug(err)
    })

    const app = require('./app')
    app.start()
  }).catch(err => {
    console.error(err)
    debug(err)
  })
