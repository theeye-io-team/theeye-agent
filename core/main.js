const config = require('config')
const Logger = require('./lib/logger')
Logger.configure(config.logger).then(() => {
  const logger = Logger.create('main')

  const envset = require('./environment')
  return envset(config).then(() => {
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
})
