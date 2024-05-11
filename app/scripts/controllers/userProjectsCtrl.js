"use strict";
/**
 *
 * @author Janick Michot, Samuel Truniger
 * This controller handles the functionality regarding the projects/courses of a user (projects/courses tab)
 */
angular.module("codeboardApp").controller("UserProjectsCtrl", [
  "$scope",
  "$rootScope",
  "$routeParams",
  "$http",
  "$location",
  "$route",
  "$timeout",
  "UserSrv",
  "FilterSrv",
  function (
    $scope,
    $rootScope,
    $routeParams,
    $http,
    $location,
    $route,
    $timeout,
    UserSrv,
    FilterSrv
  ) {
    /* Object that stores all the data of the user */
    $scope.user = {};

    /* Object that stores info about all the projects own by the user */
    $scope.ownerSet = {};
    /* Object that stores the filtered projects*/
    $scope.filteredProjects = {};

    /* Object that stores info about all the projects used by the user */
    $scope.userSet = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    $scope.searchTxt = "";

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user and user's project data from the server.
     */
    $scope.init = function () {
      $http.get("/api/users/" + $routeParams.username + "/projects")
        .then(function (result) {
          let data = result.data;

          $scope.user = {
            username: data.username,
            name: data.name,
            email: data.emailPublic,
            url: data.url,
            location: data.location,
            institution: data.institution,
          };

          $scope.ownerSet = data.ownerSet;
          $scope.filteredProjects = [...$scope.ownerSet];

          $scope.userSet = data.userSet;

          $scope.currentUserIsSelf = UserSrv.isAuthenticated() && data.username === UserSrv.getUsername();

        })
        .catch((err) => {
          console.log(err);
          // there was an error, most likely we didn't find the user, so we redirect to the 404
          $location.path("/404").replace();
        })
      };

      // fetch all the data when view is loaded
      $scope.init();

      // this filter function handles the filtering of both the projects and the courses
      $scope.filter = function (filter) {
        if (filter === "reset") {
          $scope.searchTxt = "";
        }
        let data = {
          filter: filter,
          ownerSet: $scope.ownerSet,
          searchTxt: $scope.searchTxt
        };
        $scope.filteredProjects = FilterSrv.filter(data);
      };

      $scope.shareProject = function (id) {
        let copyElement = "https://codeboard.sml.zhaw.ch/projects/" + id;
        var btn = document.getElementById("btn-" + id);
        navigator.clipboard.writeText(copyElement)
          .then(() => {
            $scope.$apply(() => {
              btn.textContent = "Link copied";
              btn.style.backgroundColor = "#3DA956";
            });

            $timeout(() => {
              btn.textContent = "Share";
              btn.style.backgroundColor = "#0064A5";
            }, 1000);
          })
          .catch((err) => {
            console.error("Error in copying text: ", err);
          });
      };
    }
]);
