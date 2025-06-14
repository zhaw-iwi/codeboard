/**
 * @author Janick Michot
 * @date 19.12.2019
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for Project Description
   */
  .controller('ideNavBarRightProjectDescriptionCtrl', [
    '$scope',
    '$rootScope',
    '$timeout',
    'IdeMsgService',
    'ProjectFactory',
    function ($scope, $rootScope, $timeout, IdeMsgService, ProjectFactory) {
      let slug = 'description';

      // scope defaults
      $scope.content = 'Keine Aufgabenbeschreibung für dieses Projekt.';

      /**
       * init this tab
       */
      $scope.init = function () {
        // get project description file
        let projectDescription = ProjectFactory.getProjectDescription();

        // check if a description is available, otherwise use broadcast to make tab disabled
        if (projectDescription === '') {
          let req = IdeMsgService.msgNavBarRightDisableTab(slug);
          $rootScope.$broadcast(req.msg, req.data);
        } else {
          $scope.content = projectDescription;
        }

        // when user, make description default tab
        if (ProjectFactory.getProject().userRole !== 'help') {
          $timeout(function () {
            let req = IdeMsgService.msgNavBarRightOpenTab('description');
            $rootScope.$broadcast(req.msg, req.data);
          }, 500);
        }
      };

      $scope.init();
    },
  ]);
