const handler = require("./ranking");

module.exports = async function (req, res) {
  return handler(req, res);
};
