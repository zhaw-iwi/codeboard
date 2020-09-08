'use strict';

/**
 * The controller for handling requests related
 * to a courses.
 *
 * @author Janick Michot
 * @date 06.02.2020
 */

var db = require('../models'),
    logSrv = require('../services/logSrv.js'),
    helpRequestSrv = require('../services/helpRequestSrv.js'),
    submissionSrv = require('../services/submissionSrv.js');


/**
 * Creates a new course for the authenticated user.
 * Assumes: user is authenticated
 */
let createCourseForUser = function (req, res) {

    // create tmp project
    let tmpCourse = {
        coursename: req.body.coursename,
        description: req.body.description || '',
        username: req.user.username,
        contextId: req.body.contextId
    };

    // create new course
    return db.Course.create(tmpCourse)
        .then(function(course) {
            // add user as owner to the course user table
            return db.CourseUserNew.create({role: 'owner', courseId: course.id, userId: req.user.id}).then(function() {
                return course.id;
            });
        })
        .then(function(courseId) {

            if (courseId !== -1) {
                logSrv.addPageLog(logSrv.events.createProjectEvent(req, courseId ));
                res.status(201).json({message: 'Successfully created course.', id: courseId});
            }
            else {
                logSrv.addPageLog(logSrv.events.failedCreateProjectEvent(req));
                res.sendStatus(500);
            }
        })
        .catch(function(err) {
            console.log(err);
        });
};

/**
 * Get user and all his courses (courseOwnerSet and courseUserSet)
 * @param req
 * @param res
 */
let getUserCourses = function(req, res) {

    console.log(req.user);

    db.User.findOne({
        attributes: ['username'],
        where: {username: req.user.username},
        include: [
            {
                model: db.CourseUserNew,
                as: 'userCourseSetNew',
                attributes: ['role'],
                include: [
                    {
                        model: db.Course,
                        as: 'course'
                    }
                ]
            }
        ]
    })
        .then(function (result) {
            // actually returns a plain object, not a JSON string
            let userCourses = result.toJSON();

            // manually flatten the result
            userCourses.userCourseSetNew.forEach(aCourse => {
                aCourse.id = aCourse.course.id;
                aCourse.coursename = aCourse.course.coursename;
                aCourse.description = aCourse.course.description;
                aCourse.contextId = aCourse.course.contextId;
                aCourse.createdAt = aCourse.course.createdAt;
                aCourse.updatedAt = aCourse.course.updatedAt;
                delete aCourse.course;
            });
            res.status(200).json(userCourses);
        })
        .error(function (err) {
            res.status(500).json({message: 'Server error.'});
        });
};


/**
 * Returns a limited course, i.e. with course information but without course participants
 * @param req
 * @param res
 */
let getLimitedCourse = function(req, res) {

    // extract the id from the route
    var courseId = req.params.courseId;

    // if course id doesn't exist, show 404
    db.Course.findOne( {
        where: {id: courseId},
        attributes: [['id', 'courseId'], 'coursename', 'description']
    })
        .then(function (course) {
            if(course) {
                course.dataValues.userRole = 'user'; // todo what is the default user role?
                res.status(200).json(course);
            } else {
                res.send(404, {message: 'The course does not exist.'});
            }
        })
        .catch(function(err) {
           console.log(err);
        });
};


/**
 * Returns a full project, i.e. with all information and the course participants
 * @param req
 * @param res
 */
let getFullCourse = function(req, res) {

    // extract the id from the route
    var courseId = req.params.courseId;

    // if course id doesn't exist, show 404
    db.Course.findOne( {
        where: {id: courseId},
        attributes: [['id', 'courseId'], 'coursename', 'description'],
        include: [
            { model: db.CourseUserNew, as: 'courseUserSetNew', attributes: ['role', 'courseId', 'userId'] }
        ]
    })
        .then(function (course) {
            if(course) {
                course.dataValues.userRole = course.courseUserSetNew.find(courseUser => courseUser.userId === req.user.id).role;
                res.status(200).json(course);
            } else {
                res.send(404, {message: 'The course does not exist.'});
            }
        })
        .catch(function(err) {
            console.log(err);
        });
};


/**
 * Returns all the users for a given course id
 *
 * @param req
 * @param res
 */
let getCourseUsers = function (req, res) {

    // extract the id from the route
    var courseId = req.params.courseId;

    db.CourseUser.findOne( {
        where: { courseId: courseId },
        attributes: ['role', 'description'],
        include: [
            { model: db.Users, as: 'courseUserSet', attributes: ['name', 'email'] }
        ]
    })
        .then(function (courseUserSet) {
            if(courseUserSet) {
                res.status(200).json(courseUserSet);
            } else {
                res.send(404, {message: 'No users found for the given course id.'});
            }
        })
        .catch(function(err) {
            console.log(err);
        });

};





/**
 * Returns all help requests for a given courseId.
 * Assumes: a valid :courseId
 * Assumes: it's established that the request was made a legit owner of the course
 * @author Janick Michot
 */
let getCourseHelpRequests = function(req, res) {

    // get the projectId from the Url path
    var courseId = req.params.courseId;
    // there could be a query ?view=compact
    var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
    // there could be a query ?userId=someUserId
    var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

    helpRequestSrv.getAllHelpRequestsForCourse(courseId, _viewQuery, _userIdQuery)
        .then(function(data) {
            res.status(200).json(data);
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({msg: 'Error while fetching help request data.'});
        });
};

/**
 * Returns all help requests for a given courseId and a given projectId
 * Assumes: a valid :courseId and a valid :projectId
 * Assumes: it's established that the request was made a legit owner of the course and project
 * @author Janick Michot
 */
let getCourseProjectHelpRequests = function(req, res) {

    // get the courseId from the Url path
    var courseId = req.params.courseId;
    // get the projectId from the Url path
    var projectId = req.params.projectId;
    // there could be a query ?view=compact
    var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
    // there could be a query ?userId=someUserId
    var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

    helpRequestSrv.getAllHelpRequestsForCourseProject(courseId, projectId, _viewQuery, _userIdQuery)
        .then(function(data) {
            res.status(200).json(data);
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({msg: 'Error while fetching help request data.'});
        });
};

/**
 * Returns all help requests for a given courseId.
 * Assumes: a valid :courseId
 * Assumes: it's established that the request was made a legit owner of the course
 * @author Janick Michot
 */
let getCourseSubmissions = function(req, res) {

    // get the projectId from the Url path
    var courseId = req.params.courseId;
    // there could be a query ?view=compact
    var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
    // there could be a query ?userId=someUserId
    var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

    submissionSrv.getAllSubmissionsForCourse(courseId, _viewQuery, _userIdQuery)
        .then(function(data) {
            res.status(200).json(data);
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({msg: 'Error while fetching help request data.'});
        });
};

/**
 * Returns all submissions for a given courseId and a given projectId
 * Assumes: a valid :courseId and a valid :projectId
 * Assumes: it's established that the request was made a legit owner of the course and project
 * @author Janick Michot
 */
let getCourseProjectSubmissions = function(req, res) {

    // get the courseId from the Url path
    var courseId = req.params.courseId;
    // get the projectId from the Url path
    var projectId = req.params.projectId;
    // there could be a query ?view=compact
    var _viewQuery = typeof req.query.view !== 'undefined' ? req.query.view : null;
    // there could be a query ?userId=someUserId
    var _userIdQuery = typeof req.query.userId !== 'undefined' ? req.query.userId : null;

    submissionSrv.getAllSubmissionsForCourseProject(courseId, projectId, _viewQuery, _userIdQuery)
        .then(function(data) {
            res.status(200).json(data);
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({msg: 'Error while fetching help request data.'});
        });
};

/**
 * Get all projects by a given courseId
 * @param req
 * @param res
 */
var getCourseUserProjects = function(req, res) {

    var _courseId = req.params.courseId;

    db.UserProject.findAll({
        attributes: ['id', 'updatedAt', 'isLastStoredByOwner', 'projectId'],
        where: {courseId: _courseId},
        include: [
            { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
            { model: db.Project, as: 'project', attributes: [['id', 'projectId'], 'projectname'] }
        ],
        order: [['user', 'username', 'asc']]
    })
    .then(function(result) {
        res.status(200).json(result);
    });
};

/**
 * Get all projects by a given courseId
 * @param req
 * @param res
 */
var getCourseProjectUserProjects = function(req, res) {

    var _courseId = req.params.courseId,
        _projectId = req.params.projectId;

    db.UserProject.findAll({
        attributes: ['id', 'updatedAt', 'isLastStoredByOwner', 'projectId'],
        where: { courseId: _courseId, projectId: _projectId },
        include: [
            { model: db.User, as: 'user', attributes: [['id', 'userId'], 'username'] },
            { model: db.Project, as: 'project', attributes: [['id', 'projectId'], 'projectname'] }
        ],
        order: [['updatedAt', 'asc']]
    })
        .then(function(result) {
            res.status(200).json(result);
        });
};

/**
 *
 * @param req
 * @param res
 */
var getCourseSettings = function(req, res) {

    // extract the id from the route
    var courseId = req.params.courseId;

    db.Course.findOne( {
        where: {id: courseId},
        attributes: ['id', 'coursename', 'description', 'contextId'],
        include: [
            { model: db.CourseUserNew, as: 'courseUserSetNew', attributes: ['role', 'userId'] },
        ]
    })
        .then(function (prj) {
            // todo logSrv.addPageLog(logSrv.events.accessProjectProfileEvent(req));
            res.status(200).json(prj);
        })
        .error(function (err) {
            console.log(err);
            res.sendStatus(500);
        });
};


/**
 * Function to update the settings of a course.
 * Requires: user is authenticated, user is course owner.
 */
var putCourseSettings = function (req, res) {

    const { check, validationResult } = require('express-validator');

    // first we validate the req
    check('coursename').not().isEmpty();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // res.send(400, 'There have been validation errors: ' + util.inspect(errors));
    }

    // get the courseId
    var courseId = req.params.courseId;

    // find and update the project
    db.Course.findByPk(courseId)
        .then(function (course) {
            course.coursename = req.body.coursename;
            course.description = req.body.description;
            course.contextId = req.body.contextId;
            return course.save();
        })
        .then(function () {
            // todo logSrv.addPageLog(logSrv.events.updateProjectProfileEvent(req));
            res.status(200).json({message: 'Course data saved.'});
        })
        .error(function (err) {
            console.log(err);
            res.status(500).json({message: 'Error while saving course data.'});
        });
};

/**
 * Deletes a course.
 * Assumes: a valid courseId
 * Assumes: the user calling has the right to delete a course (e.g. is the owner)
 */
var deleteCourse = function(req, res) {

    // get the courseId from the request
    var courseId = req.params.courseId;


    db.Course.findByPk(courseId).then(function(course) {
        return course.destroy();
    })
    .then(function() {
        res.status(200).json({msg: 'Course deletion successful.'});
    })
    .catch(function(err) {
        console.log(err);
        res.status(500).json({msg: 'Failure while trying to delete the course.'});
    });
};


/**
 *
 * @param req
 * @param res
 */
var getCourseProjects = function(req, res) {

    // the part of the URI that has the courseId
    var courseId = req.params.courseId;

    db.Project.findAll({
        attributes: ['id', 'projectname', 'language', 'description', 'createdAt', 'isPrivate'],
        include: [{
            model: db.Course, as: 'courseSet', where: {id: courseId}, attributes: ['id', 'coursename']
        }]
    })
        .then(function(aProjectSet) {
            res.status(200).json(aProjectSet);
        })
        .catch(function(err) {
            res.status(500).json({msg: 'Failure while trying to load the course projects.'});
        });
};

module.exports = {
    createCourseForUser: createCourseForUser,
    getUserCourses: getUserCourses,
    getCourseProjects: getCourseProjects,
    getLimitedCourse: getLimitedCourse,
    getFullCourse: getFullCourse,
    getCourseHelpRequests: getCourseHelpRequests,
    getCourseSubmissions: getCourseSubmissions,
    getCourseUserProjects: getCourseUserProjects,
    getCourseProjectHelpRequests: getCourseProjectHelpRequests,
    getCourseProjectSubmissions: getCourseProjectSubmissions,
    getCourseProjectUserProjects: getCourseProjectUserProjects,
    getCourseSettings: getCourseSettings,
    putCourseSettings: putCourseSettings,
    deleteCourse: deleteCourse

};
