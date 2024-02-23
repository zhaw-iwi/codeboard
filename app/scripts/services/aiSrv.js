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

    service.askForRelevantTip = function (userId, courseId, projectId, data) {
      return $http
        .post(
          "/api/ai/hints/" + userId + "/" + courseId + "/" + projectId,
          data,
          { timeout: 15000 }
        )
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };

    service.askForCompilerExplanation = function (userId, courseId, projectId, data) {
      return $http
        .post(
          "/api/ai/compiler/" + userId + "/" + courseId + "/" + projectId,
          data,
          { timeout: 15000 }
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
