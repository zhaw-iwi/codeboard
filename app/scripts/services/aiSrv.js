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

    service.askForRelevantTip = function (username, courseId, projectId, data) {
      return $http
        .post(
          "/api/ai/hints/" + username + "/" + courseId + "/" + projectId,
          data,
          { timeout: 10000 }
        )
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };

    service.askForCompilerExplanation = function (username, courseId, projectId, data) {
      return $http
        .post(
          "/api/ai/compiler/" + username + "/" + courseId + "/" + projectId,
          data,
          { timeout: 10000 }
        )
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };
  }
]);