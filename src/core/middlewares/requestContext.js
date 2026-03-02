const { randomUUID } = require('node:crypto');

function requestContext(req, res, next) {
  req.context = {
    requestId: req.headers['x-request-id'] || randomUUID(),
    user: null,
  };

  res.setHeader('x-request-id', req.context.requestId);
  next();
}

module.exports = { requestContext };
