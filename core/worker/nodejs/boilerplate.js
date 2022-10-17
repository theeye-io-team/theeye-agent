const Errors = require('../../lib/errors')

const sendErrorMessage = (error) => {
  process.send({ topic: 'error', error })
  process.exit(1)
}

process.on('unhandledRejection', function (reason, p) {
  console.error(reason, 'Unhandled Rejection at Promise', p)
  sendErrorMessage(reason)
})

process.on('uncaughtException', function (err) {
  console.error(err, 'Uncaught Exception thrown')
  sendErrorMessage(err)
})

process.once('SIGINT', function (code) {
  console.log('SIGINT received')
  sendErrorMessage(new Errors.SIGINTError())
})

process.once('SIGTERM', function (code) {
  console.log('SIGTERM received')
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
        console.error(`warning: cannot parse ${key} value as JSON`)
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
    console.log('message from parent')
    console.log(message)

    if (message.topic === 'execute') {
      const output = await moduleExecution(message)

      await new Promise( (resolve, reject) => {
        process.send({ topic: 'output', output }, (err) => {
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
