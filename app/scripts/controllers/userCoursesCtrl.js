"use strict";
/**
 *
 * @author  Samuel Truniger
 * This controller handles the functionality regarding the courses of a user (courses tab)
 */
angular.module("codeboardApp").controller("UserCoursesCtrl", [
  "$scope",
  "$routeParams",
  "$http",
  "$location",
  "UserSrv",
  "FilterSrv",
  function (
    $scope,
    $routeParams,
    $http,
    $location,
    UserSrv,
    FilterSrv,
  ) {
    // user of the requested courseSet
    $scope.username = "";

    /* Object that stores info about all the courses owned by the user */
    $scope.courseOwnerSet = {};
    /* Object that stores the filtered courses*/
    $scope.filteredCourses = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    $scope.searchTxt = "";

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user and user's project data from the server.
     */
    $scope.init = function () {
      $http.get("/api/users/" + $routeParams.username + "/courses/owner")
        .then((res) => {
          
          const data = res.data;
          
          $scope.username = data.username;
          $scope.courseOwnerSet = data.courseOwnerSet;
          $scope.filteredCourses = data.courseOwnerSet;

          $scope.currentUserIsSelf = UserSrv.isAuthenticated() && data.username === UserSrv.getUsername();
        })
        .catch((err) => {
          console.log(err);
          // there was an error, most likely we didn't find the user, so we redirect to the 404
          $location.path("/404").replace();
        });
    };
    
    // fetch all the data when view is loaded
    $scope.init();

    // this filter function handles the filtering of both the projects and the courses
    $scope.filter = function (filter) {
      if (filter === "reset") {
        $scope.searchTxt = "";
        $scope.filteredCourses = $scope.courseOwnerSet;
      }

      let data = {
        filter: filter,
        ownerSet: $scope.courseOwnerSet,
        searchTxt: $scope.searchTxt,
      };

      $scope.filteredCourses = FilterSrv.filter(data);
    };
  },
]);
