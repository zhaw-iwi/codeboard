'use strict';

var app = angular.module('codeboardApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngFileUpload',
  'ngAnimate',
  'ui.ace',
  'angularTreeview',
  'angularScreenfull',
  'ui.bootstrap',
  'ui.select',
  'ngGrid',
  'kendo.directives',
  'chart.js',
  'ngWebSocket',
  'luegg.directives', // angular-scroll-glue (make output automatically scroll to bottom when adding text, used in the IDE output element)
]);

// Optional configuration
app.config([
  'ChartJsProvider',
  function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
      colours: [
        '#949FB1', // grey
        '#97BBCD', // blue
      ],
      responsive: true,
      maintainAspectRatio: false,
      pointHitDetectionRadius: 1,
    });
  },
]);

/**  Turn on/off the angular debugging; should be off when deployed */
app.config([
  '$logProvider',
  function ($logProvider) {
    $logProvider.debugEnabled(false);
  },
]);

app.config([
  'uiSelectConfig',
  function (uiSelectConfig) {
    uiSelectConfig.theme = 'selectize';
  },
]);

app.config([
  '$routeProvider',
  '$locationProvider',
  function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/main',
        controller: 'MainCtrl',
      })
      .when('/signin', {
        templateUrl: 'partials/signin',
        controller: 'SigninCtrl',
      })
      .when('/users/:username/settings/', {
        // shows the settings for :userId
        templateUrl: 'partials/userSettings',
        controller: 'UserSettingsCtrl',
        resolve: {
          userData: [
            '$route',
            'UserResSettings',
            function ($route, UserResSettings) {
              return UserResSettings.get({ username: $route.current.params.username }).$promise;
            },
          ],
        },
      })
      .when('/users/:username', {
        // shows the :userId page (non-public projects are included when user is authorized)
        templateUrl: 'partials/userProjects',
        controller: 'UserProjectsCtrl',
      })
      .when('/users/:username/overview', {
        // shows the overview of the user
        templateUrl: 'partials/userOverview',
        controller: 'UserOverviewCtrl',
      })
      .when('/users/:username/courses', {
        // shows the :userId page (non-public projects are included when user is authorized)
        templateUrl: 'partials/userCourses',
        controller: 'UserCoursesCtrl',
      })
      .when('/users/:username/courses/:courseId/projects', {
        // returns all the projects which are part of a specific course
        templateUrl: 'partials/userCoursesProjects',
        controller: 'courseProjectsCtrl',
        resolve: {
          courseProjects: [
            '$route',
            '$http',
            'UserSrv',
            function ($route, $http, UserSrv) {
              return $http.get('/api/courses/' + $route.current.params.courseId + '/projects').then(function (result) {
                return result.data;
              });
            },
          ],
        },
      })
      .when('/users/:username/images', {
        templateUrl: 'partials/userImages',
        controller: 'UserImagesCtrl',
      })
      .when('/courses/new', {
        // user creates a new project
        templateUrl: 'partials/courses/courseNew',
        controller: 'CourseNewCtrl',
      })
      .when('/projects/new', {
        // user creates a new project
        templateUrl: 'partials/projectNew',
        controller: 'ProjectNewCtrl',
      })
      .when('/projects/:projectId/settings', {
        // allows to modify the general settings for :projectId (only accessible to project owners)
        templateUrl: 'partials/projectSettings',
        controller: 'ProjectSettingsCtrl',
        resolve: {
          projectData: [
            '$route',
            'ProjectSettingsRes',
            function ($route, ProjectSettingsRes) {
              return ProjectSettingsRes.get({ projectId: $route.current.params.projectId }).$promise;
            },
          ],
          courseSet: [
            '$route',
            '$http',
            'UserSrv',
            function ($route, $http, UserSrv) {
              return $http.get('/api/users/' + UserSrv.getUsername() + '/courses/owner').then(function (result) {
                return result.data.courseOwnerSet;
              });
            },
          ],
        },
      })
      .when('/courses/:courseId/settings', {
        templateUrl: 'partials/courses/courseSettings',
        controller: 'CourseSettingsCtrl',
        resolve: {
          courseData: [
            '$route',
            'CourseSettingsRes',
            function ($route, CourseSettingsRes) {
              return CourseSettingsRes.get({ courseId: $route.current.params.courseId }).$promise;
            },
          ],
        },
      })
      .when('/projects/:projectId/summary', {
        // TODO: shows the summary page of a project (publicly accessible if project is public)
        templateUrl: 'partials/projectSummary',
        controller: 'ProjectSummaryCtrl',
        resolve: {
          projectSummaryData: [
            '$route',
            'ProjectSummaryRes',
            function ($route, ProjectSummaryRes) {
              return ProjectSummaryRes.get({ projectId: $route.current.params.projectId });
            },
          ],
        },
      })
      .when('/projects/:projectId/stats', {
        templateUrl: 'partials/projectStats',
        controller: 'ProjectStatsCtrl',
        resolve: {
          // we don't inject any data but only check if the user is authorized to access this page
          placeHolder: [
            '$route',
            '$http',
            function ($route, $http) {
              return $http.get('/api/projects/' + $route.current.params.projectId + '/authorizedownercheck');
            },
          ],
        },
      })

      .when('/projects/:projectId/:versionType', {
        templateUrl: 'partials/userVersionsAll',
        controller: 'ProjectVersionsCtrl',
        resolve: {
          initialData: [
            '$route',
            'initialDataForProjectUserVersionsAll',
            function ($route, initialDataForProjectUserVersionsAll) {
              return initialDataForProjectUserVersionsAll(
                $route.current.params.projectId,
                $route.current.params.versionType
              );
            },
          ],
        },
      })

      .when('/courses/:courseId/:versionType', {
        templateUrl: 'partials/userVersionsAll',
        controller: 'CourseVersionsCtrl',
        resolve: {
          initialData: [
            '$route',
            'initialDataForCourseUserVersionsAll',
            function ($route, initialDataForCourseUserVersionsAll) {
              return initialDataForCourseUserVersionsAll(
                $route.current.params.courseId,
                $route.current.params.versionType
              );
            },
          ],
        },
      })

      .when('/courses/:courseId/projects/:projectId/:versionType', {
        templateUrl: 'partials/userVersionsAll',
        controller: 'CourseProjectVersionsCtrl',
        resolve: {
          initialData: [
            '$route',
            'initialDataForCourseProjectUserVersionsAll',
            function ($route, initialDataForCourseProjectUserVersionsAll) {
              return initialDataForCourseProjectUserVersionsAll(
                $route.current.params.courseId,
                $route.current.params.projectId,
                $route.current.params.versionType
              );
            },
          ],
        },
      })

      .when('/courses/:courseId/projects/:projectId', {
        templateUrl: 'partials/ide',
        controller: 'IdeCtrl',
        isAuthRequired: false,
        resolve: {
          ltiData: [
            '$route',
            'initialLtiData',
            function ($route, initialLtiData) {
              return initialLtiData;
            },
          ],
          projectData: [
            '$q',
            '$route',
            'initialProjectData',
            'initialUserProjectData',
            'UserSrv',
            function ($q, $route, initialProjectData, initialUserProjectData, UserSrv) { // initialProjectData is a factory that returns a promise
              let projectId = $route.current.params.projectId;
              let courseId = $route.current.params.courseId;
              // returns the inital project data
              return initialProjectData(projectId, courseId).then(function (_projectData) {
                // if requested user is user of a project return current stored user version
                if (_projectData.userRole === 'user' && UserSrv.isAuthenticated()) {
                  return initialUserProjectData(_projectData, UserSrv.getUsername(), projectId, courseId).catch(
                    function (err) {
                      return _projectData; // return original project data
                    }
                  );
                } else {
                  // if non authenticated user access project return inital project data
                  return _projectData;
                }
              });
            },
          ],
        },
      })

      .when('/projects/:projectId', {
        templateUrl: 'partials/ide',
        controller: 'IdeCtrl',
        isAuthRequired: false,
        resolve: {
          ltiData: [
            '$route',
            'initialLtiData',
            function ($route, initialLtiData) {
              return initialLtiData;
            },
          ],
          projectData: [
            '$route',
            'initialProjectData',
            'initialUserProjectData',
            'UserSrv',
            function ($route, initialProjectData, initialUserProjectData, UserSrv) {
              // returns the inital project data
              return initialProjectData($route.current.params.projectId, $route.current.params.courseId).then(function (
                _projectData
              ) {
                // if requested user is user of a project return current stored user version
                if (_projectData.userRole === 'user' && UserSrv.isAuthenticated()) {
                  return initialUserProjectData(
                    _projectData,
                    UserSrv.getUsername(),
                    $route.current.params.projectId,
                    $route.current.params.courseId
                  ).catch(function () {
                    return _projectData; // return original project data
                  });
                }
                return _projectData;
              });
            },
          ],
        },
      })

      .when('/projects/:projectId/helprequests/:helpRequestId', {
        // loads a help request of a user (only accessible as owner of a project > inspecting helprequests from user "{username}" )
        templateUrl: 'partials/ide',
        controller: 'IdeCtrl',
        resolve: {
          ltiData: [
            '$route',
            '$q',
            function ($route, $q) {
              let deferred = $q.defer();
              let _ltiData = {};
              deferred.resolve(_ltiData);
              return deferred.promise;
            },
          ],
          projectData: [
            '$route',
            '$http',
            'ideInitialDataForUserVersion',
            function ($route, $http, ideInitialDataForUserVersion) {
              return ideInitialDataForUserVersion(
                $route.current.params.projectId,
                $route.current.params.helpRequestId,
                'helpRequests'
              );
            },
          ],
        },
      })
      .when('/projects/:projectId/submissions/:submissionId', {
        // loads a submitted version of a user (only accessible as owner of a project > inspecting submission from user "{username}" )
        templateUrl: 'partials/ide',
        controller: 'IdeCtrl',
        resolve: {
          ltiData: [
            '$route',
            '$q',
            function ($route, $q) {
              var deferred = $q.defer();
              var _ltiData = {};
              deferred.resolve(_ltiData);
              return deferred.promise;
            },
          ],
          projectData: [
            '$route',
            'ideInitialDataForUserVersion',
            function ($route, ideInitialDataForUserVersion) {
              return ideInitialDataForUserVersion(
                $route.current.params.projectId,
                $route.current.params.submissionId,
                'submissions'
              );
            },
          ],
        },
      })
      .when('/projects/:projectId/userprojects/:userprojectId', {
        // loads a version as stored by a user in the ide (only accessible as owner of a project > inspecting user-project from user "{username}" )
        templateUrl: 'partials/ide',
        controller: 'IdeCtrl',
        resolve: {
          ltiData: [
            '$route',
            '$q',
            function ($route, $q) {
              var deferred = $q.defer();
              var _ltiData = {};
              deferred.resolve(_ltiData);
              return deferred.promise;
            },
          ],
          projectData: [
            '$route',
            'UserProjectRes',
            function ($route, UserProjectRes) {
              return UserProjectRes.get({
                projectId: $route.current.params.projectId,
                userprojectId: $route.current.params.userprojectId,
              }).$promise.then(function (aUserProject) {
                // extract the config file from the fileSet
                aUserProject.configFile = aUserProject.fileSet.find(function (file) {
                  return file.filename === 'codeboard.json';
                });

                // extract the projectDescription file from the fileSet
                aUserProject.projectDescription = aUserProject.fileSet.find(function (file) {
                  return file.filename === 'projectDescription.html';
                });

                // extract the sampleSolution file from the fileSet
                aUserProject.sampleSolution = aUserProject.fileSet.find(function (file) {
                  return file.filename === 'sampleSolution.html';
                });

                return aUserProject;
              });
            },
          ],
        },
      })
      .when('/support/lti/debug', {
        templateUrl: 'partials/supportLtiDebug',
        controller: 'SupportCtrl',
      })
      .when('/404', {
        templateUrl: 'partials/404',
      })
      .when('/401', {
        templateUrl: 'partials/401',
      })
      .otherwise({
        redirectTo: '/404',
      });

    $locationProvider.html5Mode(true);
  },
]);

app.run([
  '$rootScope',
  '$route',
  '$location',
  'UserSrv',
  function ($rootScope, $route, $location, UserSrv) {
    let unrestricted = [''];

    /**
     *
     */
    $rootScope.$on('$routeChangeStart', function (event, to) {
      if (unrestricted.indexOf(to.originalPath) >= 0) return;

      // the ide controller sets a function on onbeforeunload; we only want the in the IDE, nowhere else
      // so we reset it to null if the route changes to something different than an IDE route
      window.onbeforeunload = null;

      to.resolve = to.resolve || {};

      // if route definition dont has its own isAuth used default
      let isAuthRequired = to.isAuthRequired !== false;
      if (typeof to.resolve.isAuth === 'undefined') {
        to.resolve.isAuth = function () {
          return UserSrv.tryAuthenticateUser(isAuthRequired).catch(function (err) {
            $location.path('/');
          });
        };
      }
    });

    /**
     * Fetch errors that might occur when the routeProvider tries a 'resovle' before routing to a page.
     */
    $rootScope.$on('$routeChangeError', function (event, current, previous, rejection) {
      if (rejection.status === 401) $location.path('/401').replace();
      else $location.path('/404').replace(); // we put the replace here because then the back-button works (not state is put on the history)
    });
  },
]);
