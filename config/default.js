module.exports = {
  /**
   *
   * Core workers are required to obtain supervisor updates and to notify
   * agent status . if no core workers are configured Agent is useless.
   * by default at least the listener is required to notify supervisor
   * and get job and updates.
   *
   * workers configuration could be set via supervisor updates or
   * could be set here , and later replaced via supervisor updates.
   *
    "workers": [ // default workers
      { // listener is required to download scripts and get jobs
        "type": "listener",
        "looptime": 15000
      }, { // dstat send host information statics
        "type": "dstat",
        "looptime": 10000,
        "limit": {
          "cpu": 60,
          "disk": 90,
          "mem": 78,
          "cache": 70
        }
      }, { // psaux send the ps -aux , running process information
        "type": "psaux",
        "looptime": 15000
      }
    ]
    */
  scripts: {
    //execution_timeout: 10 * 60 * 1000 // 10 minutes in milliseconds
    execution_timeout: 10 * 60 * 1000
  },
  /**
   * connection information if provided
   * else credentials are taken from environment variables
   *
   * THEEYE_SUPERVISOR_API_URL
   * THEEYE_SUPERVISOR_CLIENT_ID
   * THEEYE_SUPERVISOR_CLIENT_SECRET
   * THEEYE_SUPERVISOR_CLIENT_CUSTOMER
   *
    "supervisor": {
      "api_url": "",
      "client_id": "",
      "client_secret": "",
      "client_customer": ""
    }
    */
  supervisor:{
  }
}
