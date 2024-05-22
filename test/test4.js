const winston = require('winston');
const log = require('topiclogger').Logger;
log.init(['general', 'security', 'development'], { levels: winston.config.syslog.levels})

log.security.alert('TEST4a from child process');
log.security.info('TEST4b from child process');
