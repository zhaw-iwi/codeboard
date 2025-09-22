/**
 * Main application file
 *
 * Note: consider storing express settings in a separate file: require('./lib/config/express')(app);
 */

'use strict';

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const passport = require('passport');
const httpProxy = require('http-proxy');
const url = require('url');
const config = require('./lib/config/config.js');

// Set default node environment to development
const env = (process.env.NODE_ENV = process.env.NODE_ENV || 'development');

// get an express instance
var app = express();

if (env === 'development') {
  app.use(require('connect-livereload')());

  // Disable caching of scripts for easier testing
  app.use(function noCache(req, res, next) {
    if (req.url.indexOf('/scripts/') === 0) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', 0);
    }
    next();
  });

  app.use(express.static(path.join(config.root, '.tmp')));
  app.use(express.static(path.join(config.root, 'app')));
  app.set('views', path.normalize(config.root + '/app/views'));
}

if (env === 'production') {
  var compression = require('compression');

  app.use(compression());
  app.use(express.static(path.join(config.root, 'public')));
  app.set('views', config.root + '/views'); // where to find the templates (partials and index)
}

// proxy forward requests to mantra (must be enabled on the test server for local development)
const proxyMantra = config.mantra.enableProxy;
if (proxyMantra) {
  var proxy = require('http-proxy').createProxyServer({
    host: config.host,
  });
  app.use('/mantra', function (req, res, next) {
    proxy.web(
      req,
      res,
      {
        target: config.mantra.url + ':' + config.mantra.port,
        changeOrigin: true,
        pathRewrite: (path) => {
          return path.replace('/mantra', '');
        },
      },
      next
    );
  });
}

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// set configuration for settings
if (env === 'test') {
  // when testing we don't want to use the mongo store but in-memory store for sessions
  app.use(
    session({
      name: config.sessionSettings.name,
      secret: config.sessionSettings.secret,
      resave: true,
      saveUninitialized: true,
    })
  );
} else {
  // connect to mongo db for logging storage
  mongoose.connect(config.mongo.uri, config.mongo.options).then(() => {
    console.log('Connected to Mongo DB for logging');
  });

  // by default we persist sessions using the Mongo database
  app.use(
    session({
      name: config.sessionSettings.cookieName,
      secret: config.sessionSettings.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      },
      store: MongoStore.create({
        mongoUrl: config.sessionSettings.uri,
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native',
        collectionName: 'sessions',
      }),
    })
  );
}

//use passport session
app.use(passport.initialize());
app.use(passport.session());
require('./lib/config/passport.js'); // configure passport & set strategy

// Create the server using app
var server = require('http').createServer(app);

// Create a proxy server that redirects WebSocket request directly to the Docker daemon.
var wsLoadBalancer = httpProxy.createProxyServer({
  target: 'ws://' + config.mantra.ip + ':' + config.mantra.port,
  changeOrigin: true,
});
// Intercept upgrade events (from http to WS) and forward the to docker daemon
server.on('upgrade', function (req, socket, head) {
  var urlObject = url.parse(req.url, true);
  var mantraNode = urlObject.query.mantra;

  req.headers.cookie = 'CoboMantraId=' + mantraNode;

  wsLoadBalancer.ws(req, socket, head);
});

// listen to error
wsLoadBalancer.on('error', function (err, req, res) {
  console.log('---\n' + new Date(Date.now()).toLocaleString('en-US') + ' HTTP-Proxy Error:');
  console.log(err);
  console.log('---');
});

// load the routes only after setting static etc. Otherwise the files won't be served correctly
require('./lib/routes')(app);

var db = require('./lib/models');

if (env === 'development') {
  // Disable the foreign key constraints before trying to sync the models.
  // Otherwise, we're likely to violate a constraint while dropping a table.
  db.sequelize
    .query('SET FOREIGN_KEY_CHECKS = 0')
    .then((res) => {
      return db.sequelize.sync({ force: false });
    })
    .then(() => {
      return db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    })
    .then((res) => {
      if (false) {
        throw err[0];
      } else {
        server.listen(config.port, function () {
          // add the template projects to the db; note that this is an async operation
          var templateProjects = require('./lib/config/dbTemplateProjects.js');
          templateProjects.addAllTemplateProjects();

          // add all system users
          var templateUsers = require('./lib/config/dbTemplateUsers.js');
          templateUsers.addAllUsers();

          console.log('Codeboard server listening on port %d in %s mode', config.port, app.get('env'));
        });
      }
    });
}

if (env === 'production') {
  var templateProjects = require('./lib/config/dbTemplateProjects.js');
  templateProjects.addAllTemplateProjects();

  // add all system users
  var templateUsers = require('./lib/config/dbTemplateUsers.js');
  templateUsers.addAllUsers();

  // start the server
  server.listen(config.port, config.listenHost, function () {
    console.log('Codeboard server listening on port %d in %s mode', config.port, app.get('env'));
  });
}

// Expose app
module.exports = app;
