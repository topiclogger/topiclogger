# Topic Logger

A topic focussed logger that is build on top of Winston that allows dynamic configuration via a config file.

For Development it is as easy as:
``` js
const log = require('topiclogger').logger;

// Define topics:
log.init('general', 'security', 'database', 'development');

// And use the topic to log something:
log.general.info('Application started');
log.security.notice('User joe@example.com failed to login');
log.development.error('Unhandled exception x occured at source.js:123');
```
For DevOps it is as easy as defining a json file:
``` json
{
    "transports": [
#       Log every error and warning to console:
        {
            "topics": "*",
            "type": "console",
            "level": "warn"
        },
#       Log everything, except development log entries, to a file:
        {
            "topics": ["*", "-development"],
            "type": "file",
            "filename": "full-log.log",
        },
#       Log all security log entries to a remote server:
        {
            "topics": "security",
            "type": "http",
            "host": "localhost",
            "port": "1234",
            "ssl": true
        },
#       Log development log entries to a custom transport:
        {
            "topics": "development",
            "type": "DailyRotateFile",
            "level": "info",
            "filename": "devlog-%DATE%.log",
            "datePattern": "YYYY-MM-DD-HH",
            "zippedArchive": true,
            "maxSize": "20m",
            "maxFiles": "14d"
        }
    ]
}
```

## Purpose

Allow topic based routing of log entries without adding complexity in your code.

## Routing

### Define routes via environment variable

You can use the "TOPICLOGGER_CONFIG" variable to supply the JSON that defines the routing.

### Define routes via a JSON file

You can define a file and tell via environment variabel "TOPICLOGGER_CONFIG_FILE" where TopicLogger can find it.

N.B. If you do not set "TOPICLOGGER_CONFIG_FILE" environment variable, TopicLogger will look for a "topiclogger.config" file in your project root.

N.B. If no file is found, all log entries will go to console.

## Transports

### Supported

Topic Logger is build on top op [Winston](https://www.npmjs.com/package/winston). So it supports the same transports.

By default the following Winston core transports are available:
- Console;
- File;
- Stream*;
<br>*=To allow defining a stream transport in the JSON configuration, an extra option "filename" is available.
- Http.

### Add none core Transports

You need to add the desired transport to your project and register it with Topic Logger.
``` js
const log = require('topiclogger').Logger;
log.winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
```

### Transport options

You can use all options that are available on your transport of choise.

Note: The "type" and "topics" options are always mandatory since it defines which transport type to use for which topic. The required transport may need additional mandatory options (e.g. "filename" for a file transport).

## Worker threads and child processes

Topic Logger is worker and child processes "safe". That means that all logging is routed to the main thread on the main process. This prevents racing conditions and file locks.

### Initialize the logger

In worker threads and child processes it is necessary to "init()" the logger. This opens communication with the thread that does the actual logging.
``` js
const log = require('topiclogger').Logger;
log.init(['general', 'security', 'development'])
```
In all other places initialization is not needed. It just is sufficient to use the logger:
``` js
const log = require('topiclogger').Logger;
log.security.info('TEST2');
```

### Child process caveat

Since the logger will not start the child proces in your project, it will not have access to it. Therefor it is needed to register the child process manually:
``` js
const child = fork('./test4');
log.watchChildProcess(child);
```

## FAQ

- **What topics can I use?**<br>Any topic you like!
- **What if I do not need any topics?**<br>Well simple ;) Do not use this package. We recommend using [Winston](https://www.npmjs.com/package/winston). That is what we are using under the hood.