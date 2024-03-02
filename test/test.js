const log = require('topiclogger').Logger;
const winston = require('winston');
log.winston.transports.DailyRotateFile = require('winston-daily-rotate-file')
const { Worker } = require('node:worker_threads');
const { fork } = require('node:child_process');

log.init(['general', 'security', 'development'])

log.general.info('App started!');
log.security.warn('App does not have any security features!');
log.development.warn('Something wrong?!');

require('./test2');

new Worker('./test3');

const child = fork('./test4');
log.watchChildProcess(child);