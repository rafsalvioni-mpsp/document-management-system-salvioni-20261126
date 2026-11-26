const path = require('node:path');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_UPLOAD_RATE_LIMIT = 60;
const DEFAULT_UPLOAD_RATE_WINDOW_MS = 60 * 1000;
const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '../../storage');

function parseInteger(name, value, defaultValue, { min, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === '') return defaultValue;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} deve ser um inteiro entre ${min} e ${max}.`);
  }

  return parsed;
}

function createConfig(env = process.env) {
  return {
    port: parseInteger('PORT', env.PORT, 3000, { min: 1, max: 65535 }),
    storageDir: path.resolve(env.STORAGE_DIR || DEFAULT_STORAGE_DIR),
    maxFileSizeBytes: parseInteger('MAX_FILE_SIZE_BYTES', env.MAX_FILE_SIZE_BYTES, DEFAULT_MAX_FILE_SIZE_BYTES, { min: 1 }),
    uploadRateLimit: parseInteger('UPLOAD_RATE_LIMIT', env.UPLOAD_RATE_LIMIT, DEFAULT_UPLOAD_RATE_LIMIT, { min: 1 }),
    uploadRateWindowMs: parseInteger('UPLOAD_RATE_WINDOW_MS', env.UPLOAD_RATE_WINDOW_MS, DEFAULT_UPLOAD_RATE_WINDOW_MS, { min: 1 }),
  };
}

module.exports = { ...createConfig(), createConfig };