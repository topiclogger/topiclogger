# Project: Topic Logger

## Purpose

Allow custom handling of log message of a specific topic

## Example of use

``````
const log = require('toppiclogger').logger;

log.init(['general', 'security', 'development'])

// Log a generic informational message
log.generic.info('The application has started');

// Log a security warning
log.security.warning('This application does not require credentials!');

// Log a development message
log.development.warning('No unit test has been written for this function!');
``````

By default all messages go to standerd out STDOUT, i.e. to console.

It will be possible to differentiate the destination(s) per topic. (NOT IMPLEMENTED YET)

## FAQ

- **What topics can I use?**<br>Any topic you like!
- **What if I do not need any topics?**<br>Well simple ;) Do not use this package. We recommend using [Winston](https://www.npmjs.com/package/winston). That is what we are using under the hood.