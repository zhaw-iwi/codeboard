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
    service.askForRelevantTip = function (courseId, projectId, data) {
      return $http
        .post("/api/ai/hints/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          throw err.data;
        });
    };

    // function to get the explanation for a compiler error
    service.askForCompilerExplanation = function (courseId, projectId, data) {
      return $http
        .post("/api/ai/compiler/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          throw err.data;
        });
    };

    // function to get the explanation for selected code
    service.askForCodeExplanation = function (courseId, projectId, data) {
      return $http
        .post("/api/ai/explanation/" + courseId + "/" + projectId, data, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          throw err.data;
        });
    };

    // function to do the code review for the users last submission
    service.askForCodeReview = function(courseId, projectId) {
      return $http
        .post("/api/ai/codeReview/" + courseId + "/" + projectId, { timeout: 15000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          throw err.data;
        });
    }
  },
]);
