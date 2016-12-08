module.exports = {
  /**
   * the listener is the default worker.
   * this worker provide information and status of the agent to the api
   */
  workers: {
    listener: {
      type: "listener",
      looptime: 15000
    }
  },
  // proxy information for api requests
  version: undefined,
  scripts: {
    path: (__dirname + '/../scripts'),
    execution_timeout: 10 * 60 * 1000 // 10 minutes in milliseconds
  },
  /**
   * can set connection information like this
   *
   *
    "supervisor": {
      "api_url": "",
      "client_id": "",
      "client_secret": "",
      "client_customer": ""
    }
   *
   * if not defined here, credentials can be defined using CLI environment variables
   *
   * THEEYE_SUPERVISOR_API_URL
   * THEEYE_SUPERVISOR_CLIENT_ID
   * THEEYE_SUPERVISOR_CLIENT_SECRET
   * THEEYE_SUPERVISOR_CLIENT_CUSTOMER
   */
  supervisor:{
  },
  request: {
    proxy: (process.env.https_proxy||process.env.https_proxy),
    tunnel: false,
    json: true,
    gzip: true,
    timeout: 15000
  }
}
