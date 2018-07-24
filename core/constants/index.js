
module.exports = {
  FAILURE_STATE: 'failure',
  SUCCESS_STATE: 'success',
  ERROR_STATE: 'error',
  CHANGED_STATE: 'changed',
  WORKERS_ERROR_EVENT: 'agent:worker:error',
  WORKERS_SCRAPER_REGISTER_BODY_SIZE: 28 * 1024, // 28 Kb
  WORKERS_SCRAPER_REGISTER_BODY: true // this is used to force to stop sending response body to the API via code
}
