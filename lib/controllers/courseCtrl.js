'use strict';

/**
 * The controller for handling requests related
 * to a courses.
 *
 * @author Janick Michot
 * @date 06.02.2020
 */

const db = require('../models');
const logSrv = require('../services/logSrv.js');
const helpRequestSrv = require('../services/helpRequestSrv.js');
const submissionSrv = require('../services/submissionSrv.js');
const { check, validationResult } = require('express-validator');
const util = require('util');
const courseSrv = require('../services/courseSrv');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

/**
 * Creates a new course for the authenticated user.
 * Assumes: user is authenticated
 */
const createCourseForUser = function (req, res) {
  // create tmp project
  let tmpCourse = {
    coursename: req.body.coursename,
    description: req.body.description || '',
    username: req.user.username,
    contextId: req.body.contextId,
  };

  // create new course
  return db.Course.create(tmpCourse)
    .then(function (course) {
      // create array for all promises used for defining course relations
      let courseRelations = [];

      // todo define course files here, if we need them in the future

      // add owner set
      courseRelations.push(
        db.User.findOne({ where: { username: tmpCourse.username } }).then(function (user) {
          course.setCourseOwnerSet([user]);
        })
      );

      // promise all and return course id
      return Promise.all(courseRelations).then(function () {
        return course.id;
      });
    })

    .then(function (courseId) {
      return courseSrv.addOrUpdateCourseOptions(courseId, req.body.courseOptions);
    })

    .then(function (courseId) {
      if (courseId !== -1) {
        logSrv.addPageLog(logSrv.events.createProjectEvent(req, courseId));
        res.status(201).json({ message: 'Successfully created course.', id: courseId });
      } else {
        logSrv.addPageLog(logSrv.events.failedCreateProjectEvent(req));
        res.sendStatus(500);
      }
    })
    .catch(function (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(500).json({ message: 'Duplicate entry for context ID' });
      } else {
        res.sendStatus(500);
      }
    });
};

/**
 * Get user and all his courses (courseOwnerSet and courseUserSet)
 * @param req
 * @param res
 */
const getUserCourses = function (req, res) {
  db.User.findOne({
    attributes: ['id', 'username'],
    where: { username: req.user.username },
    include: [
      { model: db.Course, as: 'courseOwnerSet', required: false },
      { model: db.Course, as: 'courseUserSet', required: false },
    ],
  })
    .then(function (usr) {
      res.status(200).json(usr);
    })
    .catch(function (err) {
      console.log('Error while loading courses: ', { error: err.message });
      res.status(500).json({ message: 'Failed to load courses.' });
    });
};

/**
 * Get all projects of a requested course
 * @param req
 * @param res
 */
const getCourseProjects = async function (req, res) {
  try {
    // to do: auth?
    // const username = req.params.username;
    const courseId = req.params.courseId;

    const courseProjects = await db.Course.findOne({
      where: { id: courseId },
      include: [{ model: db.Project, as: 'projectSet', required: false }],
    });

    if (courseProjects) {
      res.json(courseProjects);
    } else {
      res.status(404).json({ message: 'Course not found.' });
    }
  } catch (err) {
    console.log('Error while loading projects of course: ', { error: err.message });
    res.status(500).json({ message: 'Failed to load projects of the course.' });
  }
};

/**
 * Returns a course (as owner)
 * @param req
 * @param res
 */
const getCourse = function (req, res) {
  // extract the id from the route
  var courseId = req.params.courseId;

  // if course id doesn't exist, show 404
  db.Course.findOne({
    where: { id: courseId },
    attributes: [['id', 'courseId'], 'coursename', 'description'],
    include: [{ model: db.CourseOption, as: 'courseOptions' }],
  })
    .then(function (course) {
      if (course) {
        course.dataValues.userRole = 'owner';
        res.status(200).json(course);
      } else {
        res.send(404, { message: 'The course does not exist.' });
      }
    })
    .catch(function (err) {
      console.log(err);
    });
};

/**
 * Returns all help requests for a given courseId.
 * Assumes: a valid :courseId
 * Assumes: it's established that the request was made a legit owner of the course
 * @author Janick Michot
 */
const getCourseHelpRequests = function (req, res) {
  // get the projectId from the Url path
  var courseId = req.params.courseId;
  // there could be a query ?view=compact
  var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
  // there could be a query ?userId=someUserId
  var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

  helpRequestSrv
    .getAllHelpRequestsForCourse(courseId, _viewQuery, _userIdQuery)
    .then(function (data) {
      let promises = [];
      var orderBy = [
        ['testResult', 'DESC'],
        ['updatedAt', 'DESC'],
      ];
      data.forEach(function (helprequest) {
        var promise = submissionSrv
          .getSubmissions(helprequest.projectId, helprequest.userId, courseId, orderBy)
          .then(function (submissions) {
            helprequest.dataValues.bestSubmission = submissions[0];
          });
        promises.push(promise);
      });

      // promise all and return data
      return Promise.all(promises).then(() => data);
    })
    .then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ msg: 'Error while fetching submission data.' });
    });
};

/**
 * Returns all help requests for a given courseId and a given projectId
 * Assumes: a valid :courseId and a valid :projectId
 * Assumes: it's established that the request was made a legit owner of the course and project
 * @author Janick Michot
 */
const getCourseProjectHelpRequests = function (req, res) {
  // get the courseId from the Url path
  var courseId = req.params.courseId;
  // get the projectId from the Url path
  var projectId = req.params.projectId;
  // there could be a query ?view=compact
  var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
  // there could be a query ?userId=someUserId
  var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

  helpRequestSrv
    .getAllHelpRequestsForCourseProject(courseId, projectId, _viewQuery, _userIdQuery)
    .then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ msg: 'Error while fetching help request data.' });
    });
};

/**
 * Returns all help requests for a given courseId.
 * Assumes: a valid :courseId
 * Assumes: it's established that the request was made a legit owner of the course
 * @author Janick Michot
 */
const getCourseSubmissions = function (req, res) {
  // get the projectId from the Url path
  var courseId = req.params.courseId;
  // there could be a query ?view=compact
  var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
  // there could be a query ?userId=someUserId
  var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

  submissionSrv
    .getAllSubmissionsForCourse(courseId, _viewQuery, _userIdQuery)
    .then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ msg: 'Error while fetching help request data.' });
    });
};

/**
 * Returns all submissions for a given courseId and a given projectId
 * Assumes: a valid :courseId and a valid :projectId
 * Assumes: it's established that the request was made a legit owner of the course and project
 * @author Janick Michot
 */
const getCourseProjectSubmissions = function (req, res) {
  // get the courseId from the Url path
  var courseId = req.params.courseId;
  // get the projectId from the Url path
  var projectId = req.params.projectId;
  // there could be a query ?view=compact
  var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
  // there could be a query ?userId=someUserId
  var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

  submissionSrv
    .getAllSubmissionsForCourseProject(courseId, projectId, _viewQuery, _userIdQuery)
    .then(function (data) {
      res.status(200).json(data);
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).json({ msg: 'Error while fetching help request data.' });
    });
};

/**
 * Get all projects by a given courseId
 * @param req
 * @param res
 */
const getCourseUserProjects = function (req, res) {
  var _courseId = req.params.courseId;

  db.UserProject.findAll({
    attributes: ['id', 'updatedAt', 'isLastStoredByOwner', 'projectId'],
    where: { courseId: _courseId },
    include: [
      { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
      { model: db.Project, as: 'project', attributes: [['id', 'projectId'], 'projectname'] },
    ],
    order: [['user', 'username', 'asc']],
  }).then(function (result) {
    res.status(200).json(result);
  });
};

/**
 * Get a specific project in a given course
 * @param req
 * @param res
 */
const getCourseProjectUserProjects = function (req, res) {
  var _courseId = req.params.courseId,
    _projectId = req.params.projectId;

  db.UserProject.findAll({
    attributes: ['id', 'updatedAt', 'isLastStoredByOwner', 'projectId'],
    where: { courseId: _courseId, projectId: _projectId },
    include: [
      { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
      { model: db.Project, as: 'project', attributes: [['id', 'projectId'], 'projectname'] },
    ],
    order: [['updatedAt', 'asc']],
  })
    .then(function (result) {
      res.status(200).json(result);
    })
    .catch(function (err) {
      res.sendStatus(404);
    });
};

/**
 * Returns the data that is relevant for the settings of a project.
 * Assumes: user is authenticated, user is project owner
 */
const getCourseSettings = function (req, res) {
  var courseId = req.params.courseId;

  db.Course.findOne({
    where: { id: courseId },
    attributes: ['id', 'coursename', 'description', 'contextId'],
    include: [
      { model: db.CourseOption, as: 'courseOptions', attributes: ['option', 'value'] },
      { model: db.Project, as: 'projectSet', attributes: ['id', 'projectname'] },
    ],
  })
    .then((course) => {
      logSrv.addPageLog(logSrv.events.accessProjectProfileEvent(req));
      res.status(200).json(course);
    })
    .catch((err) => {
      res.sendStatus(500);
    });
};

/**
 * Function to update the settings of a project.
 * Requires: user is authenticated, user is project owner.
 */
const putCourseSettings = function (req, res) {
  const { check, validationResult } = require('express-validator');

  // first we validate the req
  check('coursename').not().isEmpty();
  check('contextId').not().isEmpty();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.send(400, 'There have been validation errors: ' + util.inspect(errors));
  }
  // get the projectId
  var courseId = req.params.courseId;

  // find and update the project
  db.Course.findByPk(courseId)
    .then(function (course) {
      course.coursename = req.body.coursename;
      course.description = req.body.description;
      course.contextId = req.body.contextId;
      return course.save();
    })
    .then(function (course) {
      courseSrv.addOrUpdateCourseOptions(courseId, req.body.courseOptions);
      return course;
    })
    .then(function (course) {
      return db.Project.findAll({
        where: { id: { [Op.in]: req.body.projectIds } },
      })
        .then((projects) => course.setProjectSet(projects))
        .then(() => course.getProjectSet());
    })
    .then(function (projects) {
      res.status(200).json({ msg: 'Course settings updated', projectIds: projects.map((project) => project.id) });
    })

    .catch(function (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(500).json({ message: 'Duplicate entry for context ID' });
      } else {
        res.sendStatus(500);
      }
    });
};

/**
 * Deletes a course.
 * Assumes: a valid projectId
 * Assumes: the user calling has the right to delete a project (e.g. is the owner)
 */
const deleteCourse = function (req, res) {
  db.Course.findByPk(req.params.courseId)
    .then(function (prj) {
      return prj.destroy();
    })
    .then(function () {
      res.status(200).json({ msg: 'Course successfully deleted.' });
    })
    .catch(function (err) {
      res.status(500).json({ msg: 'Error while trying to delete the course.' });
    });
};

module.exports = {
  createCourseForUser,
  getUserCourses,
  getCourseProjects,
  getCourse,
  getCourseHelpRequests,
  getCourseSubmissions,
  getCourseUserProjects,
  getCourseProjectHelpRequests,
  getCourseProjectSubmissions,
  getCourseProjectUserProjects,
  getCourseSettings,
  putCourseSettings,
  deleteCourse,
};
