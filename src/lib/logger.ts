// A simple structured logger
const logger = {
  info: (message: string, context: object = {}) => {
    console.log(JSON.stringify({ level: "INFO", message, ...context }));
  },
  warn: (message: string, context: object = {}) => {
    console.warn(JSON.stringify({ level: "WARN", message, ...context }));
  },
  error: (message: string, context: object = {}) => {
    console.error(JSON.stringify({ level: "ERROR", message, ...context }));
  },
  debug: (message: string, context: object = {}) => {
    console.debug(JSON.stringify({ level: "DEBUG", message, ...context }));
  },
};

export default logger;
