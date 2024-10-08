/**
 * This is the controller for the navBarRight Info-Tab
 *
 * @author Samuel Truniger
 * @date 19.04.2023
 *
 */
'use strict';
angular.module('codeboardApp').controller('ideNavBarRightInfoCtrl', [
  '$scope',
  'CodeboardSrv',
  'UserSrv',
  'ProjectFactory',
  'IdeMsgService',
  function ($scope, CodeboardSrv, UserSrv, ProjectFactory, IdeMsgService) {
    $scope.chatLines = [];

    var disabledActions = CodeboardSrv.getDisabledActions();
    var enabledActions = CodeboardSrv.getEnabledActions();
    const reviewTabSlug = "codeReview";

    let infoChatLines = [
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-list-alt'></span> <b>Test</b> kannst du deine Lösung testen. Falls dein Code Fehler beinhaltet wird automatisch in den <b>Compiler</b>-Tab gewechselt. Ansonsten wird das effektive Verhalten deines Programms überprüft.",
        author: 'Helper-System - Test',
        avatar: 'idea',
        tab: 'test',
      },
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-comment'></span> <b>Erklärungen</b> findest du Erklärungen zu deinem geschriebenen Code in Textform. Öffne diesen Tab, falls du den Code genauer erklärt haben willst.",
        author: 'Helper-System - Coding Assistant',
        avatar: 'idea',
        tab: 'explanation',
      },
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-exclamation-sign'></span> <b>Compiler</b> findest du Erklärungen zu den Syntax-Fehlern im Code. Beachte, dass wenn du den Code via 'Run-Button' ausführst oder ihn via 'Test-Button' überprüfst, dieser Tab bei vorhandenen Syntax-Fehler automatisch aufgerufen wird.",
        author: 'Helper-System - Compiler-Meldungen',
        avatar: 'idea',
        tab: 'compiler',
      },
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-gift'></span> <b>Tipps</b> kannst du Hinweise zur finalen Lösung anfragen. Beachte, dass die Tipps abhängig vom aktuellen Stand deiner Lösung sind.",
        author: 'Helper-System - Tipps',
        avatar: 'idea',
        tab: 'tips',
      },
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-pencil'></span> <b>Fragen</b> kannst du Fragen an Dozierende stellen, falls du mit der Aufgabe gar nicht mehr weiterkommst.",
        author: 'Helper-System - Fragen',
        avatar: 'idea',
        tab: 'questions',
      },
      {
        type: 'info',
        message: "Im Tab <span class='glyphicon glyphicon-eye-open'></span> <b>Code-Review</b> kannst du deinen Code reviewen lassen, nachdem du deine Lösung submitted hast.",
        author: 'Helper-System - Code-Review',
        avatar: 'idea',
        tab: 'codeReview',
      },
    ];

    // only add info chatLines which are not in disabledActions
    infoChatLines.forEach((chatLine) => {
      // check if the chatLine is a codeReview and do not add it if the project is not completed
      if (chatLine.tab === reviewTabSlug && !ProjectFactory.getProject().projectCompleted) {
        return;
      }
      if (!disabledActions.includes(chatLine.tab) || enabledActions.includes(chatLine.tab)) {
        $scope.chatLines.push(chatLine);
      } else if (UserSrv.isAuthenticated() && ProjectFactory.getProject().userRole !== 'user') {
        $scope.chatLines.push(chatLine);
      }
    });

    $scope.isActionHidden = function (action) {
      // if the current user is admin return false
      if (UserSrv.isAuthenticated() && ProjectFactory.getProject().userRole !== 'user') {
        return false;
      }

      return disabledActions.includes(action) && !enabledActions.includes(action);
    };

    /**
       * if a submission was successful display the code-review chatbox in the review tab
       * this operation is only executed if the chatbox has to be displayed during runtime
       */
    $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {      
      const reviewInfoBox = infoChatLines.find((chatLine) => chatLine.tab === reviewTabSlug);
      const isAlreadyAdded = $scope.chatLines.some((chatLine) => chatLine.tab === reviewTabSlug);
      if (reviewInfoBox && !isAlreadyAdded) {
        $scope.chatLines.push(reviewInfoBox)
      };
    });
  },
]);
