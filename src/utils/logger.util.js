export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

export const CURRENT_LOG_LEVEL = LogLevel.DEBUG;

const PFX = '[TabOps]';

export const log = {
  debug: (message, ...optionalParams) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(`${PFX}[DEBUG] ${message}`, ...optionalParams);
    }
  },
  info: (message, ...optionalParams) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.info(`${PFX}[INFO] ${message}`, ...optionalParams);
    }
  },
  warn: (message, ...optionalParams) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(`${PFX}[WARN] ${message}`, ...optionalParams);
    }
  },
  error: (message, ...optionalParams) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      console.error(`${PFX}[ERROR] ${message}`, ...optionalParams);
    }
  },
};
