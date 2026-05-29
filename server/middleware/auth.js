// middleware/auth.js
const jwt = require('jsonwebtoken');

// Verify JWT and attach payload to req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).send({ error: 'Access token missing' });

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY || 'secretkey');
    req.user = payload; // { _id, role }
    next();
  } catch (err) {
    res.status(403).send({ error: 'Invalid token' });
  }
}

// Authorize based on allowed roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send({ error: 'User not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).send({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };
