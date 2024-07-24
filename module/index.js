const assert = require('node:assert').strict;
const path = require('node:path');
const fs = require('node:fs');
const winston = require('winston');
const Transport = require('winston-transport');
const {isMainThread, BroadcastChannel} = require('node:worker_threads');
const process = require('node:process');
const {channel} = process;

let config;

class Logger {

    static get winston() {
        return winston;
    }

    static init(topicsIn=[], options) {
        if (isMainThread) {      
            const bc = new BroadcastChannel('topic-logger');
            bc.unref();
            bc.onmessage = (event) => {
                this[event.data.topic].log(event.data);
            }
            assert.equal(config, undefined, `topiclogger.init() can only be called once!`);
            this.readConfig();
        }
        for (const topic of topicsIn) {
            assert.equal(this[topic], undefined, `Topic "${topic}" is illegal!`);
            this[topic] = this.newTopicLogger(topic, options);
        }
        config = true;
    }

    static newTopicLogger(topic, options={}) {

        if (isMainThread && !channel) {
            return Logger.nonProxyLogger(topic, options);
        } else {
            const loggerOptions = Object.assign(
                {
                    level: 'info',
                    format: winston.format.json(),
                    defaultMeta: { topic },
                },
                options,
                {
                    transports: [new ProxyLogger()],
                }
            );
            return winston.loggers.add(topic, loggerOptions);
        }
    }
    static nonProxyLogger(topic, options={}) {
        const mappedTransports = config.transports.filter((transport) => {
            if (transport?.topics === '*') return true;
            if (transport?.topics === topic) return true;
            const transportTopics = Array.isArray(transport?.topics) ? transport.topics : [transport.topics];
            const isInclusiveList = transportTopics.includes('*');
            if (isInclusiveList) {
                const disqualifier = new RegExp(`^-${topic}$`, 'i');
                const isFound = transportTopics.find((item) => item.match(disqualifier));
                if (isFound) return false;
                return true;
            } else { // Is exclusive list
                if (transportTopics.includes(topic)) return true;
                return false;
            }
        });
        const transports = [];
        if (mappedTransports.length === 0) transports.push(new Ignore());
        for (const configuredTransport of mappedTransports) {
            const { type, ...config } = configuredTransport;
            let altConfig;
            if (type.match(/^file|stream$/i)) {
                assert(config.filename, `"filename" property is mandatory for transport type "${type}"`);
            }
            if (type.match(/stream/i)) {
                const { filename, ...streamConfig } = config;
                streamConfig.stream = fs.createWriteStream(filename);
                altConfig = streamConfig;
            }
            if (type.match(/http/i)) {
                assert(config.host, '"host" property is mandatory for transport type "http"');
                assert(config.port, '"port" property is mandatory for transport type "http"');
            }
            const transportKey = Object.keys(winston.transports).find((item) => item.toLowerCase() === type.toLowerCase());
            if (!transportKey) throw new Error(`Transport type "${transport.type}" is not supported!`);
            const transport = winston.transports[transportKey];
            if (config.filter) {
                assert.equal(typeof config.filter, 'string', `Unexpect filter value: expected string, got ${typeof config.filter}`);
                let conditions = config.filter?.split(/ and /i);
                conditions = conditions.map((item) => {
                     let {groups: {key, type, value}} = item.match(/^(?<key>[\w\.]+)\s*(?<type>=|==|!=)\s*"?(?<value>\w+)"?$/);
                     if (value.match(/undefined/i)) value = undefined;
                     return {key, type, value};
                });
                config.format = filterMessage({conditions});
            }
            transports.push(new transport(altConfig ?? config));
        }
        const loggerOptions = Object.assign(
            {
                level: 'info',
                defaultMeta: { topic },
            },
            options,
            {
                transports,
            }
        );
        return winston.loggers.add(topic, loggerOptions);
    }

    static readConfig() {
        let unparsedConfig;
        if (process.env.TOPICLOGGER_CONFIG) {
            console.log(`Using environment variable TOPICLOGGER_CONFIG for configuration`);
            unparsedConfig = process.env.TOPICLOGGER_CONFIG;
        } else {
            console.log(`Environment variable TOPICLOGGER_CONFIG not found, looking for a file`);
            let fileName = process.env.TOPICLOGGER_CONFIG_FILE;
            if (fileName) console.log(`TOPICLOGGER_CONFIG_FILE set to ${fileName}`);
            else {
                fileName = path.resolve(process.cwd(), 'topiclogger.config');
                console.log(`TOPICLOGGER_CONFIG_FILE not set, looking for ${fileName}`);
            }
            try {
                unparsedConfig = fs.readFileSync(fileName, 'UTF-8');                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn(`File "${fileName}" not found! Log entries will be written to STDIO.`);
                    unparsedConfig = JSON.stringify({
                        transports: [
                            {
                                topics: '*',
                                type: 'console',
                            }
                        ]
                    });
                }
            }
            try {
                config = JSON.parse(unparsedConfig);
            } catch (error) {
                console.error(`Error parsing config: ${error.message}`)
                throw error;
            }
        }
    }

    static watchChildProcess(child) {
        child.on('message', (data) => this[data.topic].log(data));
    }
}

class Ignore extends Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    callback();
  }
};

class ProxyLogger extends Transport {
    constructor(opts) {
      super(opts);
      if (!channel) {
          this.bc = new BroadcastChannel('topic-logger');
          this.bc.unref();
      }
    }
  
    log(info, callback) {
      if (this.bc) this.bc.postMessage(info);
      else process.send(info);
      callback();
    }
  };

const filterMessage = winston.format((info, opts) => {
    for (const condition of opts.conditions) {
        const keyList = condition.key.split('.');
        let target = info?.[keyList.shift()];
        while (target && keyList.length > 0) {
            target = target[keyList.shift()];
        }
        switch (condition.type) {
            case '=':
            case '==':
                if (target?.toString() == condition.value) {
                    continue; // match, next condition..
                }
                return false; // No match
            case '!=':
                if (target?.toString() != condition.value) {
                    continue; // match, next condition..
                }
                return false; // No match
            default:
                return false; // No match
        }
    }
    return info;
  });

module.exports = {Logger};