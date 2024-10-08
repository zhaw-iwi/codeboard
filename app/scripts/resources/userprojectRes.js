'use strict';

angular.module('codeboardApp')

    .factory('UserProjectRes', ['$resource', function($resource) {
        return $resource(
        '/api/projects/:projectId/userprojects/:userprojectId',
        {userprojectId: '@userprojectId', projectId: '@projectId'} // when doing non-post request, the :projectId is filled in through the id property of the project-object
        );
    }])

    .factory('initialUserProjectData', ['$q', '$http', 'initialLtiData', function($q, $http, initialLtiData) {

        // returns the inital user project data (current user version) > project includes the initial project data (as stored in db)
        return function(project, username, projectId, courseId = -1) {

            // create the promise that is returned
            let deferred = $q.defer();

            // the url from which to get the files of the user's project
            var _urlForUserProject = '/api/users/' + username + '/projects/' + projectId + '?courseId=' + courseId;

            // if we have a Lti user, we need to attach the Lti parameters because the server checks if the user is an lti user and grants access accordingly
            initialLtiData.then(function (ltiData) {

                if (ltiData.ltiSessionId && ltiData.ltiUserId && ltiData.ltiNonce) {
                    _urlForUserProject += '&ltiSessionId=' + ltiData.ltiSessionId + '&ltiUserId=' + ltiData.ltiUserId + '&ltiNonce=' + ltiData.ltiNonce;
                }

                // check if the user has a saved version of a project
                $http.get(_urlForUserProject)
                    .then(function (result) {

                        let fileSet = project.fileSet;
                        let index = 0;

                        // in order to have the actual project data, we loop trough the project file set.
                        // we check for every file if it is static. If not we replace the projectFile with
                        // the userProjectFile.
                        fileSet.forEach(function(file) {
                            if(!file.isStatic) {
                                let userFile = result.data.files.find(userFile => userFile.filename === file.filename);
                                if (userFile) {
                                    fileSet.splice(index, 1, userFile);
                                }
                            }
                            index++;
                        });

                        // object to display everything in the ide (combine inital project data (project object) and user specific project data (result)
                        let userProjectData = {
                            // the name of the project
                            projectname: project.projectname,
                            // the last unique Id that was used to create a file
                            lastUId: result.data.project.lastUId,
                            // programming language of the project
                            language: project.language,
                            // the role of the user who is currently looking at the project in the browser
                            userRole: project.userRole,
                            // the files of the user
                            fileSet: fileSet,
                            // the config file
                            configFile: project.configFile,
                            // the projectDescription file
                            projectDescription: project.projectDescription,
                            // the sampleSolution file
                            sampleSolution: project.sampleSolution,
                            // the course for this project
                            course: result.data.course,
                            // submission allowed?
                            isSubmissionAllowed: project.isSubmissionAllowed,
                            // has the user already completed this project?
                            projectCompleted: result.data.projectCompleted,
                            // the status of the last submission review
                            lastSubmissionHasReview: result.data.lastSubmissionHasReview,
                        };

                        deferred.resolve(userProjectData);
                    })
                    .catch( function(err) {
                        deferred.reject("UserProject or course data not found");
                    });
            });

            return deferred.promise;
        };
    }]);






