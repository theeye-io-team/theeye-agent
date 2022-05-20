
const logger = require('./lib/logger')('main')
const envset = require('./environment')
envset().then(() => {
  process.on('SIGINT', () => {
    logger.error('agent process ends on "SIGINT"')
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    logger.error('agent process ends on "SIGTERM"')
    process.exit(0)
  })
  process.on('exit', () => { // always that the process ends, throws this event
    logger.error('agent process ends on "process.exit"')
    process.exit(0)
  })
  process.on('uncaughtException', (err) => {
    logger.error('agent process on "uncaughtException"')
    logger.error(err)
  })

  const app = require('./app')
  app.start()
}).catch(err => {
  logger.error(err)
})
