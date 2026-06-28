// Logs every incoming HTTP request once it finishes: method, path, status code,
// and how long it took. Handy for seeing "what request came in" during dev.
//
// NOTE: we deliberately do NOT log request bodies — they can contain passwords
// or secret ciphertext. Only the method/path/status/timing are logged.
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const mark = status >= 500 ? "🔴" : status >= 400 ? "🟠" : "🟢";
    const time = new Date().toISOString().slice(11, 19); // HH:MM:SS
    console.log(`${mark} ${time}  ${req.method} ${req.originalUrl} → ${status}  (${ms}ms)`);
  });

  next();
}
