"use strict";

/**
 *
 * @author Samuel Truniger
 * This controller handles the functionality regarding a user and his data in the profile tab
 */

angular.module("codeboardApp").controller("UserOverviewCtrl", [
  "$scope",
  "$rootScope",
  "$routeParams",
  "$http",
  "$location",
  "$route",
  "$uibModal",
  "UserSrv",
  function (
    $scope,
    $rootScope,
    $routeParams,
    $http,
    $location,
    $route,
    $uibModal,
    UserSrv,
  ) {
    /* Object that stores all the data of the user */
    $scope.user = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user from the server.
     */
    $scope.init = function () {
      $http.get("/api/users/" + $routeParams.username).then(
        function (result) {
          let data = result.data;

          $scope.user = {
            username: data.username,
            name: data.name,
            email: data.emailPublic,
            url: data.url,
            location: data.location,
            institution: data.institution,
          };

          $scope.currentUserIsSelf =
            UserSrv.isAuthenticated() &&
            data.username === UserSrv.getUsername();
        },
        function (err) {
          // there was an error, most likely we didn't find the user, so we redirect to the 404
          $location.path("/404").replace();
        }
      );
    };
    $scope.init();
  }
]);
