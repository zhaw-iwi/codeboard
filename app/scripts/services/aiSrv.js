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
      const res = await $http.post('/api/ai/hints/' + courseId + '/' + projectId, data, { timeout: 15000 });
      return res.data;
    };

    // function to get the explanation for a compiler error
    service.askForCompilerExplanation = async function (courseId, projectId, data) {
      const res = await $http.post('/api/ai/compilerExplanation/' + courseId + '/' + projectId, data, {
        timeout: 15000,
      });
      return res.data;
    };

    // function to get the explanation for selected code
    service.askForCodeExplanation = async function (courseId, projectId, data) {
      const res = await $http.post('/api/ai/codeExplanation/' + courseId + '/' + projectId, data, {
        timeout: 15000,
      });
      return res.data;
    };

    // function to do the code review for the users last submission
    service.askForCodeReview = async function (courseId, projectId) {
      const review = await $http.post('/api/ai/codeReview/' + courseId + '/' + projectId, { timeout: 15000 });
      return review.data;
    };

    // function to get help for a student questions
    service.askForHelp = async function (courseId, projectId, data) {
      const res = await $http.post('/api/ai/help/' + courseId + '/' + projectId, data, {
        timeout: 15000,
      });
      return res.data;
    };
  },
]);
