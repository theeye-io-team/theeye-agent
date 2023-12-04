
const ScriptWorker = require('../script')
const { fork } = require('child_process')
const Errors = require('../../lib/errors')

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
          next(null, await this.moduleExecution())
        } catch (err) {
          this.debug.error('module execution failred')
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

      let log = '', resultMessage

      const child = fork( boilerplate, [], {
        stdio: ['pipe','pipe','pipe','ipc'],
        signal,
        env: this.config.script.env
      })

      child.on('error', (err) => {
        this.debug.error('failed to run.')
        reject(err)
      })

      child.stdout.on('data', (out) => {
        log += out
      })

      child.stderr.on('data', (err) => {
        log += err
      })

      child.on('close', (code) => {
        this.debug.log(`child process exited with code ${code}`)

        let state
        const data = {
          log,
          code,
          killed: (signal === 'SIGTERM' || child.killed)
        }

        if (!resultMessage) {
          state = 'failure'
          data.lastline = data.output = null
        } else if (resultMessage.topic === 'error') {
          state = 'failure'
          data.lastline = JSON.stringify(resultMessage.error)
          data.output = resultMessage.error
        } else if (resultMessage.topic === 'completed') {
          state = (resultMessage.output.state || 'success')
          data.output = (resultMessage.output.data || resultMessage.output)
          data.lastline = JSON.stringify(resultMessage.output)
        }

        resolve({ state, data })
      })

      child.on('message', (message) => {
        this.debug.log('message from child')
        this.debug.log(message)
        resultMessage = message
      })

      child.send({
        topic: 'execute',
        path: this.script.path,
        args: this.config.script.arguments
      })
    })
  }
})
