"use strict";

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

    /* Object that stores info about all the courses own by the user */
    $scope.courseOwnerSet = {};
    /* Object that stores the filtered courses*/
    $scope.filteredCourses = {};

    /* Object that stores info about all the projects own by the user */
    $scope.ownerSet = {};
    /* Object that stores the filtered projects*/
    $scope.filteredProjects = {};

    /* Object that stores the filtered projects for a course (access projects via course-view)*/
    $scope.courseProjects = {};

    /* Object that stores info about all the projects used by the user */
    $scope.userSet = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    $scope.courseId = null;
    $scope.searchTxt = "";
    $scope.searchTxtCrs = "";

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user and user's project data from the server.
     */
    $scope.init = function () {
      $scope.courseId = parseInt($routeParams.courseId);

      $http.get("/api/users/" + $routeParams.username + "/projects").then(
        function (result) {
          let data = result.data;

          $scope.user = {
            username: data.username,
            name: data.name,
            email: data.emailPublic,
            url: data.url,
            location: data.location,
            institution: data.institution,
            imageUrl: data.imageUrl
          };

          $scope.ownerSet = data.ownerSet;
          $scope.filteredProjects = [...$scope.ownerSet];
          $scope.courseOwnerSet = data.courseOwnerSet;
          $scope.filteredCourses = data.courseOwnerSet;

          if ($scope.courseId) {
            $scope.filteredProjects = $scope.courseProjects =
              $scope.ownerSet.filter((entry) =>
                entry.courseSet.some(
                  (course) => parseInt(course.id) === $scope.courseId
                )
              );
          }
          $scope.userSet = data.userSet;

          $scope.currentUserIsSelf =
            UserSrv.isAuthenticated() &&
            data.username === UserSrv.getUsername();
            console.log(data);

        },
        function (err) {
          // there was an error, most likely we didn't find the user, so we redirect to the 404
          $location.path("/404").replace();
        }
      );
    };
    $scope.init();

    // this filter function handles the filtering of both the projects and the courses
    $scope.filter = function (filter, type) {
      type = type || null;
      if (filter === "reset") {
        $scope.searchTxt = "";
        $scope.searchTxtCrs = "";
        $scope.filteredCourses = $scope.courseOwnerSet;
      }
      let data = {
        filter: filter,
        ownerSet:
          type === "prj" && !$scope.courseId
            ? $scope.ownerSet
            : type === "prj" && $scope.courseId
            ? $scope.courseProjects
            : $scope.courseOwnerSet,
        searchTxt: $scope.searchTxt || $scope.searchTxtCrs
      };
      if (type === "prj") {
        $scope.filteredProjects = FilterSrv.filter(data);
      } else if (type === "crs") {
        $scope.filteredCourses = FilterSrv.filter(data);
      }
    };

    $scope.shareProject = function (id) {
      let copyElement = "https://codeboard.sml.zhaw.ch/projects/" + id;
      var btn = document.getElementById("btn-" + id);
      navigator.clipboard
        .writeText(copyElement)
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
