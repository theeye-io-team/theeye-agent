
exports.ERROR = 'error'
exports.SUCCESS = 'success'
exports.FAILURE = 'failure'
exports.CHANGED = 'changed'

exports.SCRAPER_ERROR = 'scraper:error'
exports.SCRAPER_ERROR_REQ = 'scraper:error:request'
exports.SCRAPER_ERROR_CONFIG_STATUS_CODE_INVALID_REGEX = 'scraper:config:status_code:invalid_regexp'
exports.SCRAPER_ERROR_CONFIG_PATTERN_INVALID_REGEX = 'scraper:config:pattern:invalid_regexp'
//exports.SCRAPER_STATUS_CODE_MISMATCH = 'scraper:status_code:not_match'
exports.SCRAPER_MISMATCH_STATUS_CODE = 'scraper:mismatch:status_code'
exports.SCRAPER_MISMATCH_PATTERN = 'scraper:mismatch:pattern'

exports.FILE_RESTORED = 'file:restored'
exports.FILE_ERROR_ACCESS = 'file:error:access'
exports.FILE_ERROR_UNKNOWN = 'file:error:unknown'
exports.FILE_ERROR_EPERM = 'file:error:perm'

exports.STATS_HIGH_CPU = 'host:stats:cpu:high'
exports.STATS_HIGH_MEM = 'host:stats:mem:high'
exports.STATS_HIGH_DISK = 'host:stats:disk:high'
exports.STATS_HIGH_CACHE = 'host:stats:cache:high'
exports.STATS_RECOVERED = 'host:stats:normal'

