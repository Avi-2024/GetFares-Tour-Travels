const { createApp } = require('./app');
const modules = require('./modules');

module.exports = {
  createApp,
  ...modules,
};
