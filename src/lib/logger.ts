// A simple structured logger

function serializeContext(context: object): object {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    result[key] = value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack }
      : value;
  }
  return result;
}

const logger = {
  info: (message: string, context: object = {}) => {
    console.log(JSON.stringify({ level: "INFO", message, ...serializeContext(context) }));
  },
  warn: (message: string, context: object = {}) => {
    console.warn(JSON.stringify({ level: "WARN", message, ...serializeContext(context) }));
  },
  error: (message: string, context: object = {}) => {
    console.error(JSON.stringify({ level: "ERROR", message, ...serializeContext(context) }));
  },
  debug: (message: string, context: object = {}) => {
    console.debug(JSON.stringify({ level: "DEBUG", message, ...serializeContext(context) }));
  },
};

export default logger;
