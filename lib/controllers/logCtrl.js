'use strict';

/**
 * Created by Martin on 22/09/14.
 */

const logSrv = require('../services/logSrv.js');

const getLogs = function (req, res) {
  var result = {};
  var limit = req.params.limit;
  result = logSrv.showAllLogs(res, limit);
};

/**
 * Get compilation log summary per day. If the requests has a projectId defined, then
 * returns the summary for that projectID, otherwise it returns it for all projects
 * @param req
 * @param res
 */
const getCompilationPerDayLogs = function (req, res) {
  var projectId = req.params.projectId;
  logSrv.showCompilationPerDayLogs(req.query.startDateLogs, req.query.endDateLogs, projectId, res);
};

/**
 * Get compilation log summary per hour
 * @param req
 * @param res
 */
const getCompilationPerHourLogs = function (req, res) {
  logSrv.showCompilationPerHourLogs(res);
};

/**
 * Get project access log summary per user
 * @param req
 * @param res
 */
const getProjectAccessPerUserLogs = function (req, res) {
  logSrv.showProjectAccessPerUser(res);
};

/**
 * Get project access log summary per project
 * @param req
 * @param res
 */
const getProjectAccessPerProjectLogs = function (req, res) {
  var projectId = req.params.projectId;
  logSrv.showProjectAccessPerProject(projectId, req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * Get compilation summary per user
 * @param req
 * @param res
 */
const getCompilerActivityPerUserLogs = function (req, res) {
  logSrv.showCompilerActivityPerUser(res);
};

/**
 * Get compilation summary per project
 * @param req
 * @param res
 */
const getCompilerActivityPerProjectLogs = function (req, res) {
  var projectId = parseInt(req.params.projectId);
  logSrv.showCompilerActivityPerProject(projectId, req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * Get submit summary per project
 * @param req
 * @param res
 */
const getSubmitPerProjectLogs = function (req, res) {
  var projectId = req.params.projectId;
  logSrv.showSubmitPerProject(projectId, req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * Get compilation summary per project
 * @param req
 * @param res
 */
const getSubmitPerUserLogs = function (req, res) {
  logSrv.showSubmitPerUserLogs(res);
};

/**
 * Get the project access per day (for all projects)
 * @param req
 * @param res
 */
const getProjectAccessPerDayLogs = function (req, res) {
  var projectId = req.params.projectId;
  logSrv.showProjectAccessPerDayLogs(req.query.startDateLogs, req.query.endDateLogs, projectId, res);
};

/**
 * Get the number of active projects (different projects accessed) per day (for all projects)
 * @param req
 * @param res
 */
const getActiveProjectPerDayLogs = function (req, res) {
  logSrv.showActiveProjectPerDayLogs(req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * get the number of compilations per programming language (for all Projects)
 * @param req
 * @param res
 */
const getCompilationsPerLanguage = function (req, res) {
  logSrv.showCompilationsPerLanguage(req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * get the number of compilations errors by classifying them in (normal, slow, too slow, and error)
 * @param req
 * @param res
 */
const getCompilationsErrors = function (req, res) {
  logSrv.showCompilationsErrors(req.query.startDateLogs, req.query.endDateLogs, res);
};

/**
 * get the first 50 projects with more user accesses
 * @param req
 * @param res
 */
const getPopularProjects = function (req, res) {
  var limit = parseInt(req.param('limit'));
  logSrv.showPopularProjects(req.query.startDateLogs, req.query.endDateLogs, limit, res);
};

// export the service functions
module.exports = {
  getProjectAccessPerProjectLogs,
  getCompilerActivityPerProjectLogs,
  getSubmitPerProjectLogs,
  getCompilationPerDayLogs,
  getProjectAccessPerDayLogs,
  // the functions below are currently not used but might be in the future for a dashboard
  getLogs,
  getCompilationPerHourLogs,
  getProjectAccessPerUserLogs,
  getSubmitPerUserLogs,
  getCompilerActivityPerUserLogs,
  getCompilationsPerLanguage,
  getCompilationsErrors,
  getActiveProjectPerDayLogs,
  getPopularProjects,
};
