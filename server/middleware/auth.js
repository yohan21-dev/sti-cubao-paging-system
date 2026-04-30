const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'pagesys_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
