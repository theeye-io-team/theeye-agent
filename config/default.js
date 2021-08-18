const proxy = (process.env.https_proxy || process.env.http_proxy)

// process only one job at the same time. disable multi tasking capability
const MULTITASKING = process.env.THEEYE_AGENT_MULTITASKING === 'false' ? false : true

module.exports = {
  server: false,
  /**
   * the listener is the default worker.
   * this worker provide information and status of the agent to the api
   */
  workers: {
    // enable/disable jobs runner
    enable: true,
    // jobs runner settings
    listener: {
      type: 'listener',
      looptime: 10000,
      multitasking: MULTITASKING // process only one job at the same time. disable multi jobs processing capability
    },
    // host keep alive settings
    ping: {
      type: 'ping',
      looptime: 10000
    },
    // web request job settings
    scraper: {
      strictSSL: false,
      register_body: false,
      only_json_response: true, // server response header application/json is mandatory. ignore response body if not JSON
      gzip: true,
      timeout: 5000, // 5 secs
      proxy: proxy,
      tunnel: Boolean(proxy) // tunnel required when using proxy
    }
  },
  version: undefined,
  logs: {
    path: ( __dirname + '/../logs' )
  },
  scripts: {
    path: ( __dirname + '/../downloads' ),
    timeout: 10 * 60 * 1000, // 10 minutes
    max_buffer: 1024 * 200 // kb to bytes
  },
  binaries: {
    // use absolute paths here. binary agent requires it. __dirname only works using source code
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
  supervisor: {
    api_url: process.env.THEEYE_SUPERVISOR_API_URL || "https://supervisor.theeye.io"
  },
  request: {
    proxy: proxy,
    tunnel: Boolean(proxy), // tunnel required when using proxy
    json: true,
    gzip: true,
    timeout: 15000
  }
}
