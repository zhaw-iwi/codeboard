/**
 * Created by haches on 7/10/14.
 *
 * Controller that handles the authentication,
 * in particualr login and logout.
 */

const passport = require('passport');
const logSrv = require('../services/logSrv.js');
const userSrv = require('../services/userSrv.js');
const ltiSrv = require('../services/ltiSrv');

const login = function (req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    // errors from passport strategy
    if (err) {
      return next(err);
    }

    // auth failed
    if (!user) {
      logSrv.addPageLog(logSrv.events.failedSigninEvent(req));
      return res.status(401).json({ message: 'Wrong username or password.', authenticated: false });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      logSrv.addPageLog(logSrv.events.signinEvent(req, user.username));
      return res.status(200).json({ username: user.username, authenticated: true });
    });
  })(req, res, next);
};

const logout = function (req, res, next) {
  logSrv.addPageLog(logSrv.events.signoutEvent(req));
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ message: 'Successfully logged out.' });
  });
};

const isAuthenticated = function (req, res) {
  if (req.isAuthenticated()) {
    return res.status(200).json({ id: req.user.id, username: req.user.username, role: req.user.role });
  }
  return res.status(401).json({ message: 'The user is not authenticated.' });
};

/**
 * Tries to authenticate an lti user.
 * If authentication fails, call up the next route
 *
 * @author Janick Michot
 * @param req
 * @param res
 * @param next
 */
const authenticateLtiUserElseNextRoute = function (req, res, next) {
  passport.authenticate('lti-strategy', {}, (err, user, info) => {
    // errors from passport strategy
    if (err) {
      return next('route');
    }

    // auth failed
    if (!user) {
      logSrv.addPageLog(logSrv.events.failedLtiSigninEvent(req));
      return next('route');
    }

    req.logIn(user, {}, (err) => {
      if (err) {
        return next('route');
      }
      logSrv.addPageLog(logSrv.events.LtiSigninEvent(req, user.username));
      next();
    });
  })(req, res, next);
};

/**
 * This middleware is called when the lti user was found by its 'user_id' but the
 * 'lis_person_sourdid' changed due to moodle changes..
 * Assumes: username exists
 * @param req
 * @param res
 * @param next
 */
const updateLtiUserPassword = function (req, res, next) {
  // get username and new_pw
  const userId = req.body.user_id;
  const lisPersonSourcedid = req.body.lis_person_sourcedid;
  //
  userSrv
    .updateLtiUsers(userId, ltiSrv.generatePasswordFromLtiData(lisPersonSourcedid), lisPersonSourcedid)
    .then((user) => {
      if (user) {
        next();
      } else {
        console.log('Could not change LTI user password. User: ' + userId + ', ' + lisPersonSourcedid);
        res.status(401).json({
          message: 'LTI user login not working 1. User: ' + userId + ', ' + lisPersonSourcedid,
          authenticated: false,
        });
      }
    })
    .catch((err) => {
      console.log('Error changing lti password' + err);
      res.status(401).json({
        message: 'LTI user login not working 2. User: ' + userId + ', ' + lisPersonSourcedid,
        authenticated: false,
      });
    });
};

module.exports = {
  login,
  logout,
  isAuthenticated,
  authenticateLtiUserElseNextRoute,
  updateLtiUserPassword,
};
