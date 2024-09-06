/**
 *
 * @author Samuel Truniger
 */

"use strict";

angular.module("codeboardApp").service("AISrv", [
  "$rootScope",
  "$http",
  function ChatService($rootScope, $http) {
    var service = this;

    // function to get the most relevant hint for the code
    service.askForRelevantTip = function (userId, courseId, projectId, data) {
      return $http
        .post("/api/ai/hints/" + userId + "/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };

    // function to get the explanation for a compiler error
    service.askForCompilerExplanation = function (userId, courseId, projectId, data) {
      return $http
        .post("/api/ai/compiler/" + userId + "/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };

    // function to get the explanation for selected code
    service.askForCodeExplanation = function (userId, courseId, projectId, data) {
      return $http
        .post("/api/ai/explanation/" + userId + "/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };
  },
]);
