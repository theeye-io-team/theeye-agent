module.exports = {
  stand_alone: false,
  /**
   * the listener is the default worker.
   * this worker provide information and status of the agent to the api
   */
  workers: {
    listener: {
      type: 'listener',
      looptime: 15000
    },
    ping: {
      type: 'ping',
      looptime: 5000
    }
  },
  version: undefined,
  scripts: {
    path: ( __dirname + '/../downloads' ),
    execution_timeout: 10 * 60 * 1000 // 10 minutes in milliseconds
  },
  binaries: {
    path: process.env.THEEYE_AGENT_BINARIES_PATH || ( __dirname + '/../bin' )
  },
  /**
   * can set connection information like this
   *
   *
    "supervisor": {
      "api_url": "",
      "client_id": "",
      "client_secret": "",
      "client_customer": "",
      "client_hostname": ""
    }
   *
   * if not defined here, credentials can be defined using CLI environment variables
   *
   * THEEYE_SUPERVISOR_API_URL
   * THEEYE_SUPERVISOR_CLIENT_ID
   * THEEYE_SUPERVISOR_CLIENT_SECRET
   * THEEYE_SUPERVISOR_CLIENT_CUSTOMER
   */
  supervisor: {},
  request: {
    proxy: (process.env.https_proxy || process.env.http_proxy),
    tunnel: false,
    json: true,
    gzip: true,
    timeout: 15000
  }
}
