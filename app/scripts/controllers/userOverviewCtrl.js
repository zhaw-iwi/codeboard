'use strict';

angular.module('codeboardApp')
  .controller('UserOverviewCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', '$route', 'UserSrv',
    function ($scope, $rootScope, $routeParams, $http, $location, $route, UserSrv) {

    /* Object that stores all the data of the user */
    $scope.user = {};

    /* Object that stores info about all the projects own by the user */
    $scope.ownerSet = {};

    /* Object that stores info about all the projects used by the user */
    $scope.userSet = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user and user's project data from the server.
     */
    $scope.init = function() {


    };
    $scope.init();

  }]);


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
    controller: function GreetUserController($scope, $http, UserSrv) {

        /* Object that stores info about all the projects own by the user */
        $scope.ownerSet = {};

        /* Object that stores info about all the projects used by the user */
        $scope.userSet = {};

        // get user an all his projects
        $http.get('/api/users/' + UserSrv.getUsername() + '/projects')
            .then( function(result) {
                console.log(result.data.ownerSet);
                $scope.ownerSet = result.data.ownerSet;
                $scope.userSet= result.data.userSet;
            });
    }
});
