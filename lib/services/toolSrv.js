/**
 * This service calls the Kali server and gets the
 * result of testing a project
 *
 * @param projectId
 * @param files
 * @param options
 */
const config = require('../config/config.js');
const http = require('http');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request')); // use bluebird promises for requests

/**
 * Invokes the Eiffel compilation and returns a promise
 * @param data {object} contains the files and a property "language"
 * @returns {*|Promise} a bluebird promise
 */
const tool = function tool(data) {
  // the Tara domain name
  var url = config.tara.url + ':' + config.tara.port + '/test';

  // we define the kali payload according to the specs: https://github.com/DOSE-ETH/kali/wiki
  var payload = {
    action: 'test',
    language: data.language,
    files: data.files,
    testFiles: [],
  };

  // return the promise that resolves when the compilation finishes and the server replies
  return request.postAsync({ url: url, json: true, body: payload }).then(function ([res, body]) {
    if (res.statusCode >= 400) {
      // create an error object
      var err = {
        statusCode: res.statusCode,
        msg: res.body.msg,
      };

      // reject the promise with the error object
      return Promise.reject(err);
    } else {
      return body;
    }
  });
};

module.exports = {
  tool,
};
