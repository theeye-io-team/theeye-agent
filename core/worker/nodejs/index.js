
const ScriptWorker = require('../script')
const { fork } = require('child_process')

const path = require('path')
const boilerplate = path.join(__dirname, 'boilerplate.js')

module.exports = ScriptWorker.extend({
  getData (next) {
    this.checkScript(async err => {
      if (err) {
        this.debug.error(err)
        return next(null, {
          state: 'failure',
          data: {
            lastline: error.message,
            log: error.stack
          }
        })
      } else {
        try {
          const data = await this.moduleExecution()
          next(null, { state: 'success', data })
        } catch (err) {
          this.debug.error(err)
          next(null, { state: 'failure', data: err })
        }
      }
    })
  },
  async moduleExecution () {
    return new Promise( (resolve, reject) => {
      const controller = new AbortController()
      const { signal } = controller // abort signal

      let data = { log: '' }

      const child = fork( boilerplate, [], {
        stdio: ['pipe','pipe','pipe','ipc'],
        signal,
        env: this.config.script.env
      })

      child.on('error', (err) => {
        console.error('failed to run.')
        reject(err)
      })

      child.stdout.on('data', (out) => {
        data.log += out
      })

      child.stderr.on('data', (err) => {
        data.log += err
      })

      child.on('close', (code) => {
        console.log(`child process exited with code ${code}`)
        data.code = code
        if (code === 0) {
          resolve(data)
        } else {
          reject(data)
        }
      })

      child.on('message', (message) => {
        console.log('message from child')
        console.log(message)
        if (message.topic === 'error') {
          data.output = message.err
        } else if (message.topic === 'output') {
          data.output = message.output
        }
      })

      child.send({
        topic: 'start',
        mod: this.script.path,
        args: this.config.script.arguments
      })
    })
  }
})
