const Errors = require('../../lib/errors')
const process = require('node:process')
const logger = require('../../lib/logger').create('theeye:worker:nodejs:boilerplate')

process.on('disconnect', () => {
  logger.log('agent IPC channel disconnected')
})

process.on('beforeExit', (code) => {
  logger.log('Process beforeExit event with code: ', code);
})

process.on('exit', (code) => {
  logger.log('Process exit event with code: ', code);
})

const sendErrorMessage = (error) => {
  process.send({ topic: 'error', error })
  process.exit(1)
}

process.on('unhandledRejection', function (reason, p) {
  logger.error(reason, 'Unhandled Rejection at Promise', p)
  sendErrorMessage(reason)
})

process.on('uncaughtException', function (err) {
  logger.error(err, 'Uncaught Exception thrown')
  sendErrorMessage(err)
})

process.once('SIGINT', function (code) {
  logger.log('SIGINT received')
  sendErrorMessage(new Errors.SIGINTError())
})

process.once('SIGTERM', function (code) {
  logger.log('SIGTERM received')
  sendErrorMessage(new Errors.SIGTERMError())
})

// NodeJs boilerplate
const moduleExecution = async function (options) {
  const context = {}
  for (let key in process.env) {
    if (/^THEEYE_/.test(key) === true) {
      let lckey = key.toLowerCase()
      try {
        context[lckey] = JSON.parse(process.env[key])
      } catch (err) {
        logger.error(`warning: cannot parse ${key} value as JSON`)
        context[lckey] = process.env[key] // keep untouch
      }
    }
  }

  const handler = require(options.path)
  if (typeof handler !== 'function') {
    throw new Errors.ModuleHandlerError()
  }

  // invoke function with args. "this" has the 
  return handler(options.args)
}

process.on('message', async (message) => {
  try {
    logger.log('message from parent')
    logger.log(message)

    if (message.topic === 'execute') {
      const output = await moduleExecution(message)

      await new Promise( (resolve, reject) => {
        process.send({ topic: 'completed', output }, (err) => {
          if (err) { reject(err) }
          else { resolve() }
        })
      })

      process.exit(0)
    }
  } catch (error) {
    sendErrorMessage(error)
  }
})
