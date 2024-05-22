const winston = require('winston');
const log = require('topiclogger').Logger;
log.init(['general', 'security', 'development'], { levels: winston.config.syslog.levels})

log.security.notice('TEST3a');
log.security.info('TEST3b');
