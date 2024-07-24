const log = require('topiclogger').Logger;
const winston = require('winston');
log.winston.transports.DailyRotateFile = require('winston-daily-rotate-file')
const { Worker } = require('node:worker_threads');
const { fork } = require('node:child_process');
log.init(['general', 'security', 'development'], { levels: winston.config.syslog.levels})
log.general.info('App started!');
log.general.alert('Some alert')
log.security.info('App does not have any security features!', {private: true});
log.security.info({foo: 'bar'}, {private: true});
log.development.warning('Something wrong?!');

require('./test2');

new Worker('./test3');

const child = fork('./test4');
log.watchChildProcess(child);