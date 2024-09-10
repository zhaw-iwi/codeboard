/**
 * @author Janick Michot
 * @date 19.12.2019
 */

'use strict';

angular.module('codeboardApp')

    /**
     * Controller for the Sample Solution tab
     */
    .controller('ideNavBarRightSampleSolutionCtrl', ['$scope', '$rootScope', '$sce', '$timeout', 'IdeMsgService', 'ProjectFactory',
    function ($scope, $rootScope, $sce, $timeout, IdeMsgService, ProjectFactory) {

      const slug = 'sampleSolution';

      // scope defaults
      $scope.sampleSolution = "";

      $scope.init = function() {
        
        /**
         * check if the a sample solution is available and that the user has a correct submission / or is has not the role of a user (e.g. owner),
         * otherwise disable the tab
         */
        if (ProjectFactory.hasSampleSolution() && (ProjectFactory.getProject().projectCompleted || ProjectFactory.getProject().userRole !== 'user')) {                   
          $scope.sampleSolution = ProjectFactory.getSampleSolution();          
        } else {     
          let req = IdeMsgService.msgNavBarRightDisableTab(slug);
          $rootScope.$broadcast(req.msg, req.data);
        }
      };

      // init this tab
      $scope.init();

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab have to be enabled during runtime
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        let req = IdeMsgService.msgNavBarRightEnableTab("sampleSolution");
        $rootScope.$broadcast(req.msg, req.data);
        $scope.init();
      });

    }]);
