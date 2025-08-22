const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    // Get token from either x-auth-token or Authorization header
    let token = req.header('x-auth-token');

    if (!token) {
      const authHeader = req.header('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]; // Extract token after "Bearer "
      }
    }

    // If no token found, block request
    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};
