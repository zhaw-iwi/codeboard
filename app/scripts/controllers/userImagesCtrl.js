"use strict";

/**
 *
 * @author Samuel Truniger
 * This controller handles the functionality regarding the images for projects which can be accessed via the top-navbar.
 * Images can be used for project-descriptions in projects
 */

angular.module("codeboardApp").controller("UserImagesCtrl", [
  "$scope",
  "$rootScope",
  "$routeParams",
  "$http",
  "$location",
  "$timeout",
  "$route",
  "$uibModal",
  "UserSrv",
  "FilterSrv",
  "Upload",
  function (
    $scope,
    $rootScope,
    $routeParams,
    $http,
    $location,
    $timeout,
    $route,
    $uibModal,
    UserSrv,
    FilterSrv,
    Upload
  ) {
    /* Object that stores all the data of the user */
    $scope.user = {};
    $scope.imgs = [];
    $scope.results = {
      deleted: [],
      success: [],
      duplicate: [],
      fileFormat: [],
      error: []
    };
    $scope.filteredImgs = {};

    /* Parameter that is true if the user is watching her own page, otherwise false; use to display buttons */
    $scope.currentUserIsSelf = false;

    /**
     * Function runs when the controller is loaded the first time.
     * Gets the user and user's images from the server.
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
            imageUrl: data.imageUrl
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

      $http
        .get("/api/users/" + $routeParams.username + "/projectImages")
        .then(function (result) {
          let data = result.data;
          $scope.imgs = data.imgSet;
          $scope.filteredImgs = data.imgSet;
        })
        .catch(function (err) {
          $location.path("/404").replace();
        });
    };
    $scope.init();

    $scope.uploadImgs = function (selectedImgs) {
      Upload.upload({
        url: "/api/users/" + $routeParams.username + "/projectImages",
        file: selectedImgs
      })
        .then(function (res) {
          res.data.imgResults.forEach((res) => {
            $scope.results[res.type].push(res.file);
          });
        })
        .catch(function (err) {
          $scope.results["error"].push(err);
        });
      // open img upload result modal
      openImageModal();
    };

    $scope.deleteImg = function (id) {
      $http
        .delete("/api/users/" + $routeParams.username + "/projectImages/" + id)
        .then(function (res) {
          $scope.results["deleted"].push(res.data.message);
        })
        .catch(function (err) {
          $scope.results["error"].push(err);
        });
      openImageModal();
    };

    $scope.copyImgElement = function (id) {
      let img;
      $scope.imgs.forEach((e) => {
        if (e.id === id) {
          img = e;
        }
      });
      var imgElement = `<img src='${img.path}' alt='${img.imgName}' width='90%'>`;
      var btn = document.getElementById("btn" + id);
      navigator.clipboard
        .writeText(imgElement)
        .then(() => {
          btn.textContent = "Copied";
          btn.style.backgroundColor = "#3DA956";

          $timeout(() => {
            btn.textContent = "Copy";
            btn.style.backgroundColor = "#DDDDDD";
          }, 1000);
        })
        .catch(function (err) {
          console.error("Error in copying text: ", err);
        });
    };

    var openImageModal = function () {
      let ImageUploadModalCtrl = [
        "$scope",
        "$uibModalInstance",
        function ($scope, $uibModalInstance, data) {
          $scope.cancel = function () {
            $uibModalInstance.close();
          };
        }
      ];

      let modalInstance = $uibModal.open({
        scope: $scope,
        templateUrl: "ideUploadImgModal.html",
        controller: ImageUploadModalCtrl,
        size: "md",
        resolve: {
          results: () => {
            return $scope.results;
          }
        }
      });

      modalInstance.result.then(function () {
        $route.reload();
      });
    };

    $scope.filter = function (filter) {
      let data = {
        filter: filter,
        imgSet: $scope.imgs,
        searchTxt: $scope.searchTxt
      };
      $scope.filteredImgs = FilterSrv.filter(data);
      if (data.filter === "reset") {
        $scope.searchTxt = "";
      }
    };
  }
]);
