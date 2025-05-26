/**
 * @author Janick Michot
 * @date 19.12.2019
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for the Sample Solution tab
   */
  .controller('ideNavBarRightSampleSolutionCtrl', [
    '$scope',
    '$rootScope',
    'IdeMsgService',
    'ProjectFactory',
    function ($scope, $rootScope, IdeMsgService, ProjectFactory) {
      // scope defaults
      $scope.sampleSolution = null;

      $scope.init = function () {
        $scope.sampleSolution = ProjectFactory.getSampleSolution();
      };

      // init this tab (gets called when the tab is not hidden from ide.js)
      $scope.init();

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab have to be enabled 
       * during runtime (e.g. when disabled before successful submission)
       * but the tab is not hidden
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        // since this event is triggered also when no sample solution is available, 
        // we have to check if the tab should be enabled
        if (ProjectFactory.hasSampleSolution()) {
          let req = IdeMsgService.msgNavBarRightEnableTab('sampleSolution');
          $rootScope.$broadcast(req.msg, req.data);
          $scope.init();
        }
      });
    },
  ]);
