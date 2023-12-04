
class ExtendedError extends Error {
  constructor (message = '', options = {}) {
    super(message||'Error Message')
    this.name = this.constructor.name
    this.code = options.code||'ErrorCode'
  }

  toJSON () {
    const alt = {}
    const storeKey = function (key) {
      alt[key] = this[key]
    }
    Object.getOwnPropertyNames(this).forEach(storeKey, this)
    return alt
  }

  toString () {
    return this.toJSON()
  }
}

exports.ExtendedError = ExtendedError

class ValidationError extends ExtendedError {
  constructor () {
    super('ValidationError')
  }
}

exports.ValidationError = ValidationError

class SIGINTError extends ExtendedError {
  constructor (message, options) {
    super('SIGINT Interruption signal received')
  }
}

exports.SIGINTError = SIGINTError

class SIGTERMError extends ExtendedError {
  constructor (message, options) {
    super('SIGTERM Terminate signal received')
  }
}

exports.SIGTERMError = SIGTERMError

class UncaughtExceptionError extends ExtendedError {
  constructor (message, options) {
    super('Uncaught exception captured')
  }
}

exports.UncaughtExceptionError = UncaughtExceptionError

class UnhandledRejectionError extends ExtendedError {
  constructor (message, options) {
    super('Unhandled promise rejection captured')
  }
}

exports.UnhandledRejectionError = UnhandledRejectionError

class ModuleHandlerError extends ExtendedError {
  constructor (message, options) {
    super('Script must exports a handler function')
  }
}

exports.ModuleHandlerError = ModuleHandlerError
