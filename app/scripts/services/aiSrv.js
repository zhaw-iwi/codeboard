/**
 *
 * @author Samuel Truniger
 */

'use strict';

angular.module('codeboardApp').service('AISrv', [
  '$http',
  function ChatService($http) {
    var service = this;

    // function to get the most relevant hint for the code
    service.askForRelevantTip = async function (courseId, projectId, data) {
      const res = await $http.post(`/api/courses/${courseId}/projects/${projectId}/ai/hints`, data, { timeout: 15000 });
      return res.data;
    };

    // function to get the explanation for a compiler error
    service.askForCompilerExplanation = async function (courseId, projectId, data) {
      const res = await $http.post(`/api/courses/${courseId}/projects/${projectId}/ai/compilerExplanation`, data, {
        timeout: 15000,
      });
      return res.data;
    };

    // function to get the explanation for selected code
    service.askForCodeExplanation = async function (courseId, projectId, data) {
      const res = await $http.post(`/api/courses/${courseId}/projects/${projectId}/ai/codeExplanation`, data, {
        timeout: 15000,
      });
      return res.data;
    };

    // function to do the code review for the users last submission
    service.askForCodeReview = async function (courseId, projectId) {
      const review = await $http.post(`/api/courses/${courseId}/projects/${projectId}/ai/codeReview`, {
        timeout: 15000,
      });
      return review.data;
    };

    // function to get help for a student questions
    service.askForHelp = async function (courseId, projectId, data) {
      const res = await $http.post(`/api/courses/${courseId}/projects/${projectId}/ai/help`, data, {
        timeout: 15000,
      });
      return res.data;
    };

    // function to get the remaining requests for the user
    // this function is called on every page load from ide.js
    // to enable/disable the corresponding ai service request buttons
    service.getRemainingRequests = async function (username) {
      const res = await $http.get(`/api/users/${username}/requestLimit`);
      return res.data;
    };
  },
]);
