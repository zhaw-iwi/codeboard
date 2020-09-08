'use strict';

angular.module('codeboardApp')
    .controller('CourseCtrl', ['$scope', '$routeParams', function ($scope, $routeParams) {

        console.log($routeParams);

        $scope.courseId = $routeParams.courseId;


        this.data = $routeParams.courseId;

    }]);

// todo split into different components

angular.module('codeboardApp').component('userCourseList', {
    templateUrl: 'partials/components/userCourseList',
    transclude: true,
    controller: function GreetUserController($scope, $http, UserSrv) {

        /* Object that stores info about all the courses*/
        $scope.courseSet = [];

        // get users courses
        $http.get('/api/users/' + UserSrv.getUsername() + '/courses')
            .then( function(result) {
                $scope.userCourseSet = result.data.userCourseSetNew || [];
            })
            .catch(function(err) {
                console.log(err);
            });
    }
});

angular.module('codeboardApp').component('userProjectList', {
    templateUrl: 'partials/components/userProjectList',
    transclude: true,
    bindings: {
        "courseId": "<"
    },
    controller: function ($element, $scope, $http, UserSrv) {

        let _this = this;

        /* Object that stores info about all the projects own by the user */
        $scope.ownerSet = {};

        /* Object that stores info about all the projects used by the user */
        $scope.userSet = {};

        // Called after all the controllers on an element have been constructed and had their bindings initialized
        this.$onInit = function() {

            // get the optional courseid
            var courseId = _this.courseId;

            // check if course id is set, if so we add it to the where clause
            if (typeof courseId !== typeof undefined && courseId !== false) {
                // get all projects within a course
                $http.get('/api/courses/' + courseId  + '/projects')
                    .then( function(result) {
                        $scope.ownerSet = result.data;
                    });
            } else {
                // get user an all his projects
                $http.get('/api/users/' + UserSrv.getUsername() + '/projects')
                    .then( function(result) {
                        console.log(result.data.ownerSet);
                        $scope.ownerSet = result.data.ownerSet;
                        $scope.userSet= result.data.userSet;
                    });
            }
        };
    }
});



