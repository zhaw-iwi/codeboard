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

// used to serialize the user for the session
// decides what user data should be stored in the session
passport.serializeUser((user, cb) => {
  return cb(null, user.id);
});

// used to deserialize the user
// turn the session data back into a proper user object
passport.deserializeUser(async (id, cb) => {
  try {
    const user = await db.User.findByPk(id, { attributes: ['id', 'username', 'email', 'role'] });
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
});

/**
 * Strategy to handle normal user authentication
 * @author Janick Michot
 */
passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'username', // these are optional & only need be used in case 'username' and 'password' are names used in the request
      passwordField: 'password', // this is the virtual field on the model
    },
    async (username, password, cb) => {
      try {
        const user = await db.User.scope('nonLtiUser').findOne({
          attributes: ['id', 'username', 'email', 'role', 'password', 'salt'],
          where: Sequelize.or({ username: username }, { email: username }),
        });
        if (!user) {
          return cb(null, false, { message: 'User is not registered.' });
        }
        if (!util.verifyPassword(password, user.password, user.salt)) {
          return cb(null, false, { message: 'Incorrect password' });
        }
        return cb(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        });
      } catch (err) {
        return cb(err);
      }
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
    async (req, username, password, cb) => {
      try {
        // generate password from `lis_person_sourcedid`
        password = ltiSrv.generatePasswordFromLtiData(password);

        // check if we are in the context of an lti request
        if (!ltiSrv.isRequestAuthorized(req)) {
          console.log('LTI users can only be logged in in the context of an LTI request.');
          return cb(null, false, { message: 'LTI users can only be logged in in the context of an LTI request.' });
        }

        const user = await db.User.scope('ltiUser').findOne({
          attributes: ['id', 'username', 'password', 'salt'],
          where: { username: username },
        });

        if (!user) {
          console.log('User is not registered.');
          return cb(null, false, { message: 'User is not registered.' });
        }
        // error: incorrect password
        if (!util.verifyPassword(password, user.password, user.salt)) {
          console.log('Incorrect password');
          return cb(null, false, { message: 'Incorrect password' });
        }
        // if authentication successful, serialize user information..
        return cb(null, { id: user.id, username: user.username, email: user.email, role: 'ltiUser' });
      } catch (err) {
        return cb(err);
      }
    }
  )
);

module.exports = passport;
