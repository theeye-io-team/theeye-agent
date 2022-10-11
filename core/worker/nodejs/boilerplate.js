Error.prototype.toJSON = function () {
  const alt = {}
  const storeKey = function(key) {
    alt[key] = this[key]
  }
  Object.getOwnPropertyNames(this).forEach(storeKey, this)
  return alt
}
Error.prototype.toString = function () {
  return this.toJSON()
}

process.on('unhandledRejection', (reason, p) => {
  console.error(reason, 'Unhandled Rejection at Promise', p)
  process.send({ topic: 'error', err: reason })
  process.exit(1)
})

process.on('uncaughtException', err => {
  console.error(err, 'Uncaught Exception thrown')
  process.send({ topic: 'error', err })
  process.exit(1)
})

process.once('SIGINT', function (code) {
  console.log('SIGINT received');
  const err = new Error('SIGINT received')
  err.code = code
  process.send({ topic: 'error', err })
  process.exit(1)
})

process.once('SIGTERM', function (code) {
  console.log('SIGTERM received...');
  const err = new Error('SIGTERM received')
  err.code = code
  process.send({ topic: 'error', err })
  process.exit(1)
})


// NodeJs boilerplate
const moduleExecution = async function (script, args) {

  const runtime = {}
  for (let key in process.env) {
    if (/^THEEYE_/.test(key) === true) {
      let lckey = key.toLowerCase()
      try {
        runtime[lckey] = JSON.parse(process.env[key])
      } catch (err) {
        console.error(`warning: cannot parse ${key} value as JSON`)
        runtime[lckey] = process.env[key] // keep untouch
      }
    }
  }
  this.runtime = runtime

  const handler = require(script)
  if (typeof handler !== 'function') {
    throw new Error('invalid function')
  }

  // invoke function with args. "this" has the 
  return handler.call(this, args)
}

process.on('message', async (message) => {
  try {
    console.log('message from parent')
    console.log(message)

    if (message.topic === 'start') {
      const output = await moduleExecution(message.mod, message.args)

      await new Promise( (resolve, reject) => {
        process.send({ topic: 'output', output }, (err) => {
          if (err) { reject(err) }
          else { resolve() }
        })
      })

      process.exit(0)
    }
  } catch (err) {
    console.error(err)
    process.send({ topic: 'error', err })
    process.exit(1)
  }
})
