/**
 * Created by hce on 9/9/14.
 *
 * This service module provides a number of
 * utility functions for submissions of program solutions.
 *
 */
'use strict';

const db = require('../models');
const Sequelize = require('sequelize');

/**
 * Retrieves submission data from the database. The resulting data is in a compact format that only lists how
 * many submissions each user has.
 *
 * @param args {Object} projectId: the projectId for which to retrieve the submission data
 *                      courseId: the courseId for which to retrieve the submission data
 *                      restrictToUserId: set is to a number to restrict the query to a particular userId; otherwise set it to null;
 * @param orderBy
 * @return {*} a Promise that resolves to Json array with submission data if the db query is successful
 */
const _getSubmissionsInCompactView = function (args, orderBy = null) {
  // define whereClause
  let _whereClause = {};

  // construct the where clause for the db query
  if (args.projectId) _whereClause.projectId = args.projectId;
  if (args.courseId) _whereClause.courseId = args.courseId;
  if (args.userId) _whereClause.userId = args.userId;

  orderBy = orderBy ? orderBy : [['createdAt', 'DESC']];

  if (args.testResult !== undefined) {
    _whereClause.testResult = {
      [db.Sequelize.Op.gt]: args.testResult,
    };
  }

  return db.Submission.findAll({
    where: _whereClause,
    attributes: [[Sequelize.fn('count', Sequelize.col('id')), 'numOfSubmissions']],
    include: [{ model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] }],
    order: orderBy,
  });
};

/**
 * Retrieves submission data from the database. The resulting data is in a format that contains each submission
 * of every user.
 *
 * @param args {Object} projectId: the projectId for which to retrieve the submission data
 *                      courseId: the courseId for which to retrieve the submission data
 *                      restrictToUserId: set is to a number to restrict the query to a particular userId; otherwise set it to null;
 * @param orderBy
 * @return {*} a Promise that resolves to Json array with submission data if the db query is successful
 */
const _getSubmissionsInFullView = function (args, orderBy = null) {
  // define whereClause
  let _whereClause = {};

  // construct the where clause for the db query
  if (args.projectId) {
    _whereClause.projectId = args.projectId;
  }
  if (args.courseId) {
    _whereClause.courseId = args.courseId;
  }
  if (args.userId) {
    _whereClause.userId = args.userId;
  }
  if (args.testResult !== undefined) {
    _whereClause.testResult = {
      [db.Sequelize.Op.gt]: args.testResult,
    };
  }

  orderBy = orderBy ? orderBy : [['createdAt', 'DESC']];

  // the promise to fetch the data from the db
  return db.Submission.findAll({
    attributes: [
      ['id', 'submissionId'],
      'id',
      'ltiSessionId',
      'hasResult',
      'testResult',
      'numTestsPassed',
      'numTestsFailed',
      'createdAt',
      'updatedAt',
      'projectId',
    ],
    where: _whereClause,
    include: [
      { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
      { model: db.Project, as: 'project', attributes: [['id', 'projectId'], 'projectname'] },
    ],
    order: orderBy,
  });
};

/**
 * Retrieves submission data
 * @param projectId
 * @param userId
 * @param courseId
 * @param orderBy
 * @param args
 * @param viewType {String} what form the submission data should have; leave empty or use 'compact' here
 * @return {*} a Promise, resolving to the submission data if the retrieval from the db is successful
 */
const getSubmissions = function (
  projectId,
  userId = null,
  courseId = null,
  orderBy = null,
  args = {},
  viewType = null
) {
  let _args = {
    projectId: projectId,
    userId: !isNaN(Number(userId)) ? Number(userId) : null,
    courseId: !isNaN(Number(courseId)) ? Number(courseId) : null,
  };

  for (var key in args) {
    if (args.hasOwnProperty(key)) {
      _args[key] = args[key];
    }
  }

  return viewType === 'compact'
    ? _getSubmissionsInCompactView(_args, orderBy)
    : _getSubmissionsInFullView(_args, orderBy);
};

/**
 * Retrieves submission data for a given project.
 * @param projectId {Number} the projectId for which to retrieve the submission data
 * @param viewType {String} what form the submission data should have; leave empty or use 'compact' here
 * @param restrictToUserId {String} restrict the submission data to a particular userId; if not needed put null
 * @return {*} a Promise, resolving to the submission data if the retrieval from the db is successful
 */
const getAllSubmissionsForProject = function (projectId, viewType, restrictToUserId) {
  // check if restrictToUserId contains a number; we do this by formatting it from String to Number and checking for NaN
  let args = {
    projectId: projectId,
    userId: isNaN(Number(restrictToUserId)) ? Number(restrictToUserId) : null,
  };
  return viewType === 'compact' ? _getSubmissionsInCompactView(args) : _getSubmissionsInFullView(args);
};

/**
 *
 * @param projectId
 * @param viewType
 * @returns {*}
 */
const getUserSuccessfulSubmissions = function (projectId, userId, courseId = null, viewType = 'compact') {
  // define whereClause
  let _whereClause = {};

  // construct the where clause for the db query
  if (projectId) _whereClause.projectId = projectId;
  if (courseId) _whereClause.courseId = courseId;
  if (userId) _whereClause.userId = userId;

  _whereClause.testResult = {
    [db.Sequelize.Op.gte]: 1,
  };

  return db.Submission.count({
    where: _whereClause,
    include: [{ model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] }],
  });
};

/**
 * Returns help request data for a given course.
 * @param courseId {Number} the courseId for which to retrieve the help request data
 * @param viewType {String} what form the help request data should have; leave empty or use 'compact' here
 * @param restrictToUserId {String} restrict the help request  data to a particular userId; if not needed put null
 * @return {*} a Promise, resolving to the help request  data if the retrieval from the db is successful
 */
const getAllSubmissionsForCourse = function (courseId, viewType, restrictToUserId) {
  // check if restrictToUserId contains a number; we do this by formatting it from String to Number and checking for NaN
  let args = {
    courseId: courseId,
    userId: isNaN(Number(restrictToUserId)) ? Number(restrictToUserId) : null,
  };
  return viewType === 'compact' ? _getSubmissionsInCompactView(args) : _getSubmissionsInFullView(args);
};

/**
 * Returns help request data for a given course and a given project.
 * @param courseId {Number} the courseId for which to retrieve the help request data
 * @param projectId {Number} the projectId for which to retrieve the help request data
 * @param viewType {String} what form the help request data should have; leave empty or use 'compact' here
 * @param restrictToUserId {String} restrict the help request  data to a particular userId; if not needed put null
 * @return {*} a Promise, resolving to the help request  data if the retrieval from the db is successful
 */
const getAllSubmissionsForCourseProject = function (courseId, projectId, viewType, restrictToUserId) {
  // check if restrictToUserId contains a number; we do this by formatting it from String to Number and checking for NaN
  let args = {
    courseId: courseId,
    projectId: projectId,
    userId: isNaN(Number(restrictToUserId)) ? Number(restrictToUserId) : null,
  };
  return viewType === 'compact' ? _getSubmissionsInCompactView(args) : _getSubmissionsInFullView(args);
};

/**
 * Get submission by id
 * @param submissionId
 * @returns {Promise}
 */
const getSubmissionById = function (submissionId) {
  return db.Submission.findOne({
    attributes: [
      ['id', 'submissionId'],
      'ltiSessionId',
      'hasResult',
      'testResult',
      'numTestsPassed',
      'numTestsFailed',
      'createdAt',
      'updatedAt',
      'projectId',
      'userFilesDump',
      'hiddenFilesDump',
    ],
    where: { id: submissionId },
    include: [
      { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
      { model: db.Project, as: 'project', attributes: ['id', 'projectname', 'language'] },
    ],
  }).then(function (submission) {
    var result = {};

    if (submission !== null) {
      // found a submission with the given submissionId

      result.submissionId = submission.get('submissionId'); // using get() because of https://github.com/sequelize/sequelize/issues/2360
      result.hasResult = submission.hasResult;
      result.testResult = submission.testResult;
      result.numTestsPassed = submission.numTestsPassed;
      result.numTestsFailed = submission.numTestsFailed;
      result.isLtiSubmission = submission.ltiSessionId !== -1;
      result.createdAt = submission.createdAt;
      result.updatedAt = submission.updatedAt;

      result.userFilesDump = JSON.parse(submission.userFilesDump);
      result.hiddenFilesDump = JSON.parse(submission.hiddenFilesDump);

      result.project = {
        projectId: submission.project.id,
        projectname: submission.project.projectname,
        language: submission.project.language,
      };

      result.user = submission.user;
    }

    return result;
  });
};

/**
 * Get submission by courseId, projectId and userId
 * @param projectId
 * @param userId
 * @returns {Promise}
 */
const getUserSubmissionForProjectInCourse = async function (courseId, projectId, userId) {  
  const submission = await db.Submission.findOne({
    where: { userId: userId, projectId: projectId, courseId: courseId },
    order: [['createdAt', 'DESC']],
  });

  if (!submission) {
    throw new Error('No submission found!');
  }

  return submission;
};

/**
 * Update submission by courseId, projectId and userId
 * Currently used for marking the submission as reviewed
 * @param projectId
 * @param userId
 * @param data
 * @returns {Promise}
 */
const updateUserSubmissionForProjectInCourse = async function (courseId, projectId, userId, data) {
  const submission = await getUserSubmissionForProjectInCourse(courseId, projectId, userId);

  await submission.update(data);
};

module.exports = {
  getAllSubmissionsForProject,
  getSubmissionById,
  getUserSuccessfulSubmissions,
  getAllSubmissionsForCourseProject,
  getAllSubmissionsForCourse,
  getSubmissions,
  getUserSubmissionForProjectInCourse,
  updateUserSubmissionForProjectInCourse,
};
