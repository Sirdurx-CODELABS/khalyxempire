export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'An account with that email already exists' });
  }
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Server error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    message,
    errors: err.errors || undefined
  });
}

export function notFound(_req, res) {
  res.status(404).json({ message: 'Not found' });
}
