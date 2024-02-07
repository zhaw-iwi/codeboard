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

    service.askForRelevantTip = function (data) {
      return $http
        .post("/api/ai/hints", data, { timeout: 10000 })
        .then(function (res) {
          return res.data;
        })
        .catch(function (err) {
          console.log(err);
        });
    };
  }
]);
