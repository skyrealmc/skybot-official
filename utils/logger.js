function write(level, message, error) {
  const timestamp = new Date().toISOString();
  if (error) {
    console[level](`[${timestamp}] ${message}`, error);
    return;
  }

  console[level](`[${timestamp}] ${message}`);
}

module.exports = {
  info: (message) => write("log", message),
  warn: (message) => write("warn", message),
  error: (message, error) => write("error", message, error)
};
