'use strict';

const index = require('./controllers/index.js');
const authCtrl = require('./controllers/authenticationCtrl.js');
const projectCtrl = require('./controllers/projectCtrl.js');
const courseCtrl = require('./controllers/courseCtrl.js');
const userCtrl = require('./controllers/userCtrl.js');
const uploadCtrl = require('./controllers/uploadCtrl.js');
const imgCtrl = require('./controllers/imgCtrl.js');
const mw = require('./middleware.js');
const logCtrl = require('./controllers/logCtrl.js');
const supportCtrl = require('./controllers/supportCtrl.js');
const chatCtrl = require('./controllers/chatCtrl.js');
const aiCtrl = require('./controllers/aiCtrl.js')


/**
 * Application routes
 */
module.exports = function(app) {

  /** Routes related to a session **/

  app.get('/api/session', authCtrl.isAuthenticated);
  app.post('/api/session', authCtrl.login);
  app.delete('/api/session', authCtrl.logout);


  /** Routes related to users **/

  app.get('/api/users', mw.isAuth, userCtrl.getUsers); // get profile of a user, details vary based ownership
  app.get('/api/users/:username', mw.isAuth, userCtrl.getUser);
  // todo app.post('/api/users', userCtrl.createUser);

  app.post('/api/users/:username/projectImages', mw.isAuth, mw.isSelf,uploadCtrl.uploadImages); // add images usable for projects of a specific user
  app.get('/api/users/:username/projectImages', mw.isAuth, mw.isSelf, imgCtrl.getUploadImages); // get images usable for projects of a specific user
  app.delete('/api/users/:username/projectImages/:imgId', mw.isAuth, mw.isSelf, imgCtrl.deleteImage) // delete images from the image store
  app.get('/api/users/:username/settings', mw.isAuth, mw.isSelf, userCtrl.getUserSettings); // get the user data for displaying in the settings form; this contains data that otherwise should be secret, e.g. the non-public email of the user
  app.put('/api/users/:username/settings', mw.isAuth, mw.isSelf, userCtrl.putUserSettings); // update the user data
  app.put('/api/users/:username/settings/password', mw.isAuth, mw.isSelf, userCtrl.putPassword); // update the user's password

  // routes for projects that are linked to a user
  app.get('/api/users/:username/projects', mw.isAuth, projectCtrl.getUserProjects); // get all projects of a user

  // get the version of a project for displaying in the IDE as it has been stored by a user (UserProject)
  app.get('/api/users/:username/projects/:projectId', mw.isAuth, mw.isValidProjectId, mw.isUserElseNextRoute, projectCtrl.getUserProject); // user must have access rights to retrieve her version of the project
  app.get('/api/users/:username/projects/:projectId', mw.isLtiUserElseNextRoute, projectCtrl.getUserProject); // (assume: isAuth, isValidProjectId) project may be private but current user is an LTI user
  app.get('/api/users/:username/projects/:projectId', mw.isPublicProject, projectCtrl.getUserProject); // (assume: isAuth, validProjectId) project is public so every user can retrieve her version of the project


  /** Routes related to courses **/

  app.post('/api/courses', mw.isAuth, courseCtrl.createCourseForUser);
  app.get('/api/courses/:courseId', mw.isAuth, mw.isValidCourseId, courseCtrl.getCourse);
  app.get('/api/courses/:courseId/projects', mw.isValidCourseId, mw.isAuth, mw.isCourseOwner, courseCtrl.getCourseProjects);
  app.get('/api/users/:username/courses/owner', mw.isAuth, mw.isSelf, courseCtrl.getUserCourses);

  // routes for the settings of a project
  app.get('/api/courses/:courseId/settings', mw.isValidCourseId, mw.isAuth, mw.isCourseOwner, courseCtrl.getCourseSettings);
  app.put('/api/courses/:courseId/settings', mw.isValidCourseId, mw.isAuth, mw.isCourseOwner, courseCtrl.putCourseSettings);
  app.delete('/api/courses/:courseId', mw.isValidCourseId, mw.isAuth, mw.isCourseOwner, courseCtrl.deleteCourse);

  /** Routes related to multiple projects **/

  app.get('/api/projects', mw.isAuth, projectCtrl.getAllProjects); // get all public projects
  app.post('/api/projects', mw.isAuth, projectCtrl.createProjectForUser); // create a new project


  /** Routes related to a project **/

  // route that's only used to check if the current user is an owner of the project
  // (used in Angular's router at "resolve" time to prevent rendering of pages a user is not authorized to see)
  app.get('/api/projects/:projectId/authorizedownercheck', mw.isOwner, projectCtrl.isAuthorizedOwner);

  // routes for the settings of a project
  app.get('/api/projects/:projectId/settings', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.getProjectSettings);
  app.put('/api/projects/:projectId/settings', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.putProjectSettings);

  // Note: the following routes use "next('route')" in the middleware; Note: the follow-up routes don't do redundant checks for isValidProject
  // if the project id is valid, the user is authenticated and the owner, load the full project
  app.get('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwnerElseNextRoute, projectCtrl.getFullProject);
  // (if the project id is valid) the user is authenticated and a user of the project, load the limited view of the project
  app.get('/api/projects/:projectId', mw.isUserElseNextRoute, projectCtrl.getLimitedProject);
  app.get('/api/projects/:projectId', mw.isLtiUserElseNextRoute, projectCtrl.getLimitedProject);
  // (if the project id is valid) the user is authenticated and the project is public, load the limited view of the project
  app.get('/api/projects/:projectId', mw.isPublicProject, projectCtrl.getLimitedProject);

  // to do > the best way?
  app.get('/api/projects/:projectId/sampleSolution', mw.isAuth, projectCtrl.getSampleSolution);

  // update a project (for project owners) or save a version (for project users) > only works when accessing a project in a course
  app.put('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwnerElseNextRoute, projectCtrl.putProject); // current user is owner, so we modify the actual project
  app.put('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isUserElseNextRoute, projectCtrl.putProjectForUser); // current user has access rights to project, so we save a version for the user
  app.put('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isLtiUserElseNextRoute, projectCtrl.putProjectForUser); // current user has no access rights but connects via LTI which overrides the access rights
  app.put('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isPublicProject, projectCtrl.putProjectForUser); // project is public, so we can save a version for every authenticated user

  // delete a project
  app.delete('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.deleteProject);

  // run operations on a project (e.g. compile, run, test); Note: the follow-up routes don't do redundant checks for isValidProject
  app.post('/api/projects/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwnerElseNextRoute, projectCtrl.runActionOnProject);
  app.post('/api/projects/:projectId', mw.isUserElseNextRoute, projectCtrl.runLimitedActionOnProject);
  app.post('/api/projects/:projectId', mw.isLtiUserElseNextRoute, projectCtrl.runLimitedActionOnProject);
  app.post('/api/projects/:projectId', mw.isPublicProject, projectCtrl.runLimitedActionOnProject);


  /** Routes for the summary of a project */

  // to a the summary of a project, the project must be public, or the current user must be owner or user of the project (then it can be private)
  app.get('/api/projects/:projectId/summary', mw.isValidProjectId, mw.isAuth, mw.isOwnerOrUserElseNextRoute, projectCtrl.getProjectSummary);
  app.get('/api/projects/:projectId/summary', mw.isPublicProject, projectCtrl.getProjectSummary);


  /** Routes  used when an LTI Tool Consumer wants to access a project */

  // route where the Tool Consumer posts the basic LTI data
  app.post('/lti/projects', mw.setProjectIdFromLtiRequest, mw.isValidProjectId, mw.isLtiRequestAuthorized, mw.isAuthElseNextRoute, mw.isLtiUserIdEqualsUserName, projectCtrl.initLtiSession);
  app.post('/lti/projects', mw.setProjectIdFromLtiRequest, mw.isReturningLtiUserElseNextRoute, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession);
  app.post('/lti/projects', mw.setProjectIdFromLtiRequest, mw.isReturningLtiUserElseNextRoute, authCtrl.updateLtiUserPassword, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession); // quickfix for changing moodle lis_person_source_id todo maybe replace
  app.post('/lti/projects', mw.setProjectIdFromLtiRequest, mw.isLtiUserCreatableElseNextRoute, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession);

  // old routes for LTI access (remove in future)
  app.post('/lti/projects/:projectId', mw.isValidProjectId, mw.isLtiRequestAuthorized, mw.isAuthElseNextRoute, mw.isLtiUserIdEqualsUserName, projectCtrl.initLtiSession);
  app.post('/lti/projects/:projectId', mw.isReturningLtiUserElseNextRoute, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession);
  app.post('/lti/projects/:projectId', mw.isReturningLtiUserElseNextRoute, authCtrl.updateLtiUserPassword, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession); // quickfix for changing moodle lis_person_source_id todo maybe replace
  app.post('/lti/projects/:projectId', mw.isLtiUserCreatableElseNextRoute, authCtrl.authenticateLtiUserElseNextRoute, projectCtrl.initLtiSession);
  // app.post('/lti/projects/:projectId', projectCtrl.initLtiSessionWithoutUser);


  /** Routes for versions of a project stored by users */

  app.get('/api/projects/:projectId/userprojects', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.getAllUserProjectsForProject);
  app.get('/api/projects/:projectId/userprojects/:userprojectId', mw.isValidProjectIdAndUserprojectIdCombo, mw.isAuth, mw.isOwner, projectCtrl.getUserProjectForProject);
  app.get('/api/courses/:courseId/userProjects', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, courseCtrl.getCourseUserProjects);
  app.get('/api/courses/:courseId/projects/:projectId/userprojects', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, mw.isProjectInCourse, courseCtrl.getCourseProjectUserProjects);


  /** Route to handle submissions */

  app.get('/api/projects/:projectId/submissions', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.getAllSubmissions);
  app.post('/api/projects/:projectId/submissions',  mw.isAuth, mw.isValidProjectId, projectCtrl.createSubmission);
  app.get('/api/projects/:projectId/submissions/:submissionId', mw.isValidProjectIdAndSubmissionIdCombo, mw.isAuth, mw.isOwner, projectCtrl.getSubmission);
  app.get('/api/courses/:courseId/submissions', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, courseCtrl.getCourseSubmissions);
  app.get('/api/courses/:courseId/projects/:projectId/submissions', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, mw.isProjectInCourse, courseCtrl.getCourseProjectSubmissions);


  /** Route to handle help requests */

  app.post('/api/projects/:projectId/helpRequests', mw.isValidProjectId, mw.isAuth, mw.isLtiUserElseNextRoute, projectCtrl.createHelpRequest);
  app.post('/api/projects/:projectId/helpRequests', mw.isPublicProject, projectCtrl.createHelpRequest); 
  // route to create request if users access via user of a private project?

  app.put('/api/projects/:projectId/helpRequests', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.updateHelpRequest); // only owner can modify help request, eg. updating the status

  app.get('/api/projects/:projectId/helpRequests/:helpRequestId', mw.isValidProjectIdAndHelpRequestIdCombo, mw.isAuth, mw.isOwner, projectCtrl.getHelpRequest);
  app.get('/api/projects/:projectId/helpRequests', mw.isValidProjectId, mw.isAuth, mw.isOwner, projectCtrl.getAllHelpRequests);
  app.get('/api/courses/:courseId/helpRequests', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, courseCtrl.getCourseHelpRequests); // todo check isCourseOwner
  app.get('/api/courses/:courseId/projects/:projectId/helpRequests', mw.isAuth, mw.isValidCourseId, mw.isCourseOwner, mw.isProjectInCourse, courseCtrl.getCourseProjectHelpRequests);


    /** Routes used for logging functionality */

  app.get('/api/log/user/summaryProjectAccess/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, logCtrl.getProjectAccessPerProjectLogs);
  app.get('/api/log/user/summaryCompiler/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, logCtrl.getCompilerActivityPerProjectLogs);
  app.get('/api/log/user/summarySubmitAccess/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, logCtrl.getSubmitPerProjectLogs);
  app.get('/api/log/user/summaryProjectCompilationRunDay/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, logCtrl.getCompilationPerDayLogs); // get the summary of compilation and run per day for a project id
  app.get('/api/log/user/summaryProjectAccessDay/:projectId', mw.isValidProjectId, mw.isAuth, mw.isOwner, logCtrl.getProjectAccessPerDayLogs); // get the summary of user access per day for a project id


  /** Routes for the help and chat functionality */
  app.get('/api/chat/:username/:projectId', mw.isValidProjectId, mw.isAuth, chatCtrl.getChatHistory);
  app.post('/api/chat/:username/:projectId', mw.isValidProjectId, mw.isAuth, chatCtrl.addChatLine);
  app.post('/api/projects/:projectId/chats/delete', mw.isValidProjectId, mw.isAuth, chatCtrl.deleteChatLine);

  // app.put('/api/chat/chatLines/:chatLineId', mw.isAuth, chatCtrl.rateChatLine);
  // app.put('/api/chat/chatLines/:chatLineId', mw.isAuth, chatCtrl.rateErrorCompilationMessage); // todo replace by general chatLine rating


  /** Routes for the support and debugging functionality */
  // to do - still needed?
  app.post('/support/lti/debug', supportCtrl.initLtiSession);
  app.put('/support/lti/debug/outcome', supportCtrl.sendOutcome);


  /** Routes to start and stop container */
  app.get('/api/startContainer/:mantraId/:containerId/start', projectCtrl.startContainer);
  app.get('/api/stopContainer/:mantraId/:containerId/stop', projectCtrl.stopContainer);


  /** Routes used for help **/
  app.post('/api/:projectId/help/compilation', mw.isAuth, projectCtrl.getHelpForCompilation);

  /** Submodules **/
  app.use('/api/help', mw.isAuth, require('./modules/errAndExcHelp/errAndExcHelpRoutes.js'));

  /** Routes related to AI integration (hints/compiler-messages) **/
  app.get('/api/users/:username/requestLimit', mw.isAuth, mw.isSelf, aiCtrl.getRemainingRequests);
  app.post('/api/courses/:courseId/projects/:projectId/ai/hints', mw.isAuth, mw.hasCourseId, mw.checkReqLimit, aiCtrl.getRelevantHint);
  app.post('/api/courses/:courseId/projects/:projectId/ai/compilerExplanation', mw.isAuth, mw.hasCourseId, mw.checkReqLimit, aiCtrl.getCompilerExplanation);
  app.post('/api/courses/:courseId/projects/:projectId/ai/codeExplanation', mw.isAuth, mw.hasCourseId, mw.checkReqLimit, aiCtrl.getCodeExplanation);
  app.post('/api/courses/:courseId/projects/:projectId/ai/codeReview', mw.isAuth, mw.hasCourseId, mw.checkReqLimit, aiCtrl.getCodeReview);
  app.post('/api/courses/:courseId/projects/:projectId/ai/help', mw.isAuth, mw.hasCourseId, mw.checkReqLimit, aiCtrl.getHelp);
  app.get('/api/ai/stats', mw.isAuth, mw.isAdmin, aiCtrl.getUsageStats);


  // All undefined api routes should return a 404
  app.get('/api/*', function(req, res) {
    res.sendStatus(404);
  });


  // All other routes to use Angular routing in app/scripts/app.js
  app.get('/partials/*', index.partials);

  app.get('/*', index.index);
};
