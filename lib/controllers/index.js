'use strict';

var path = require('path');

/**
 * Send partial, or 404 if it doesn't exist
 */
exports.partials = function (req, res) {
  var stripped = req.url.split('.')[0]; // remove .html extension
  var requestedView = path.join('./', stripped); // make relative path e.g. ./partials/foo/bar
  res.render(requestedView, function (err, html) {
    if (err) {
      console.log("Error rendering partial '" + requestedView + "'\n", err);
      return res.sendStatus(404);
    }
    return res.send(html);
  });
};

/**
 * Send our single page app
 */
exports.index = function (req, res) {
  res.render('index'); // load index.html
};
