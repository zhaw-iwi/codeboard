/**
 * @author Janick Michot
 * @date 19.12.2019
 */

'use strict';

angular.module('codeboardApp')

    /**
     * Controller for Project Description
     */
    .controller('ideNavBarRightSampleSolutionCtrl', ['$scope', '$rootScope', '$sce', '$timeout', 'IdeMsgService', 'ProjectFactory',
    function ($scope, $rootScope, $sce, $timeout, IdeMsgService, ProjectFactory) {

      let slug = 'sampleSolution';

      // scope defaults
      $scope.sampleSolution = "";

      /**
       * init this tab
       */
      $scope.init = function() {
        
        /**
         * check if the a sample solution is available and that the user has a correct submission,
         * otherwise disable the tab
         */
        if (ProjectFactory.hasSampleSolution() && (ProjectFactory.getProject().projectCompleted || ProjectFactory.getProject().userRole !== 'user')) {                   
          $scope.sampleSolution = ProjectFactory.getSampleSolution();          
        } else {     
          let req = IdeMsgService.msgNavBarRightDisableTab(slug);
          $rootScope.$broadcast(req.msg, req.data);
        }
      };

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
