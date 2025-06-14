/**
 * Created by haches on 7/8/14.
 *
 * Defines the strategy of passport.js
 *
 * Provides serialization & de-serialization functions for sessions.
 */

'use strict';

const db = require('../models');
const Sequelize = require('sequelize');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const util = require('../util.js');
const ltiSrv = require('../services/ltiSrv');

/**
 * Passport configuration
 */
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// add other strategies for more authentication flexibility
passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'username', // these are optional & only need be used in case 'username' and 'password' are names used in the request
      passwordField: 'password', // this is the virtual field on the model
    },
    function (username, password, done) {
      db.User.scope('nonLtiUser')
        .findOne({
          attributes: ['id', 'username', 'email', 'role', 'password', 'salt'],
          where: Sequelize.or({ username: username }, { email: username }),
        })
        .then((user) => {
          if (user === null) {
            return done(null, false, { message: 'User is not registered.' });
          }

          if (!util.verifyPassword(password, user.password, user.salt)) {
            return done(null, false, { message: 'Incorrect password' });
          }

          return done(null, { id: user.id, username: user.username, email: user.email, role: user.role }); // we serialize the username, id and email
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

/**
 * Strategy to handle lti user authentication
 * @author Janick Michot
 */
passport.use(
  'lti-strategy',
  new LocalStrategy(
    {
      usernameField: 'user_id', // these are optional & only need be used in case 'username' and 'password' are names used in the request
      passwordField: 'lis_person_sourcedid', // this is the virtual field on the model
      passReqToCallback: true, // this options allows us to check the request (req) if we are really in an lti request
    },
    function (req, username, password, done) {
      // generate password from `lis_person_sourcedid`
      password = ltiSrv.generatePasswordFromLtiData(password);

      // check if we are in the context of an lti request
      if (!ltiSrv.isRequestAuthorized(req)) {
        console.log('LTI users can only be logged in in the context of an LTI request.');
        return done(null, false, { message: 'LTI users can only be logged in in the context of an LTI request.' });
      }

      // error: lti user authentication only works for lti users. Therefore we use scope 'ltiUser'
      db.User.scope('ltiUser')
        .findOne({
          attributes: ['id', 'username', 'password', 'salt'],
          where: { username: username },
        })
        .then((user) => {
          // error: user not found
          if (user === null) {
            console.log('User is not registered.');
            return done(null, false, { message: 'User is not registered.' });
          }

          // error: incorrect password
          if (!util.verifyPassword(password, user.password, user.salt)) {
            console.log('Incorrect password');
            return done(null, false, { message: 'Incorrect password' });
          }

          // if authentication successful, serialize user information..
          return done(null, { id: user.id, username: user.username, email: user.email, role: 'ltiUser' });
        });
    }
  )
);

module.exports = passport;
