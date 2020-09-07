'use strict';

/**
 * Controller for administrating an course.
 * We assume that this controller is only loaded
 * if the current user is an owner of the course.
 * Nevertheless, the server must validate the
 * users authorization again before storing any changes.
 *
 * @author Janick Michot
 */

angular.module('codeboardApp')
    .controller('CourseNewCtrl', ['$scope', '$http', '$routeParams', '$location', function ($scope, $http, $routeParams, $location) {

        // Object that holds the properties of a course and binds to the form
        $scope.data = {
            coursename: '',
            description: '',
            contextId: ''
        };

        // Object's values are used to show success or failure message after saving data to server
        $scope.server = {
            saveSuccess: false,
            saveFailure: false
        };

        $scope.save = function(form) {

            if(form.$valid) {
                var payload = {
                    coursename: $scope.data.coursename,
                    description: $scope.data.description,
                    contextId: $scope.data.contextId
                };

                // hide user messages (in case they are displayed from a previous saving attempt)
                $scope.server.saveSuccess = false;
                $scope.server.saveFailure = false;

                $http.post('/api/courses/', payload)
                    .then(function() {
                        // show the success message
                        $scope.server.saveSuccess = true;

                        // redirect to main page
                        $location.path("/");

                    }, function(error) {
                        // show the error message and remove it after 4 seconds
                        $scope.server.saveFailure = true;
                    });
            }
        };

    }]);



angular.module('codeboardApp')
    .controller('CourseSettingsCtrl', ['$scope', '$http', '$log', '$routeParams', '$location', '$timeout', '$uibModal', 'CourseRes', 'courseData',
        function ($scope, $http, $log, $routeParams, $location, $timeout, $uibModal, CourseRes, courseData) {

            // Object that holds the properties of a course and binds to the form
            $scope.data = {};
            // keeps a copy of the original data that was send from the server; used to discard any changes
            $scope.originalData = {};

            // get the course id from the current route (used in the header to link to the course's summary page)
            $scope.courseId = $routeParams.courseId;

            // Object's values are used to show success or failure message after saving data to server
            $scope.server = {
                saveSuccess: false,
                saveFailure: false
            };

            /**
             * Function gets the courses data from the server and sets it up for display
             */
            $scope.init = function () {

                angular.copy(courseData, $scope.originalData);
                $scope.data = courseData;

                // todo irgendwie neue Peoples hinzufügen können
            };
            $scope.init();


            $scope.discardChanges = function () {
                angular.copy($scope.originalData, $scope.data);
            };


            $scope.save = function (form) {

                var courseId = $routeParams.courseId;

                if (form.$valid) {
                    var payload = {
                        coursename: $scope.data.coursename,
                        description: $scope.data.description,
                        contextId: $scope.data.contextId
                    };

                    // hide user messages (in case they are displayed from a previous saving attempt)
                    $scope.server.saveSuccess = false;
                    $scope.server.saveFailure = false;

                    $http.put('/api/courses/' + courseId + '/settings', payload)
                        .then(function (result) {

                            console.log(result);

                            // show the success message and remove it after 4 seconds
                            $scope.server.saveSuccess = true;
                            $timeout(function () {
                                $scope.server.saveSuccess = false;
                            }, 4000);

                        }, function (error) {
                            // show the error message and remove it after 4 seconds
                            $scope.server.saveFailure = true;
                        });
                }
            };


            /**
             * Deletes the current course.
             */
            var deleteCourse = function () {

                // todo

                CourseRes.remove(
                    {courseId: $routeParams.courseId},
                    function (successValue) {
                        $log.debug('Deletion ok');
                        // the course deletion was successful, thus we now need to redirect the user from the settings page
                        $location.url('/');
                    },
                    function (errorValue) {
                        $log.debug('Deletion failed');
                    }
                );
            };


            /**
             * The controller for the deletionModal
             */
            var deletionModalInstanceCtrl = ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {

                $scope.ok = function () {
                    $uibModalInstance.close();
                };

                $scope.cancel = function () {
                    $uibModalInstance.dismiss();
                };
            }];


            /**
             * Function to open the modal where the user must confirm the deletion of a course
             */
            $scope.openDeletionModal = function () {

                var modalInstance = $uibModal.open({
                    templateUrl: 'DeletionModalContent.html',
                    controller: deletionModalInstanceCtrl
                });

                modalInstance.result.then(
                    function () {
                        // the user clicked ok
                        $log.debug('User confirmed deletion of course.');
                        deleteCourse();
                    },
                    function () {
                        // the user canceled
                        $log.debug('User canceled deletion of course.');
                    });
            };
        }]);
