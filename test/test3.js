const log = require('topiclogger').Logger;
log.init(['general', 'security', 'development'])

log.security.info('TEST3');
