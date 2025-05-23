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
  'ProjectFactory',
  'IdeMsgService',
  function ($scope, CodeboardSrv, ProjectFactory, IdeMsgService) {
    $scope.chatLines = [];

    const disabledActions = CodeboardSrv.getDisabledActions();
    const enabledActions = CodeboardSrv.getEnabledActions();
    const reviewTabSlug = 'codeReview';

    let infoChatLines = [
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-list-alt'></span> <b>Test</b> kannst du deine Lösung testen. Falls dein Code Fehler beinhaltet wird automatisch in den <b>Compiler</b>-Tab gewechselt. Ansonsten wird das effektive Verhalten deines Programms überprüft.",
        author: 'Helper-System - Test',
        avatar: 'idea',
        tab: 'test',
      },
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-comment'></span> <b>Erklärungen</b> findest du Erklärungen zu deinem geschriebenen Code in Textform. Öffne diesen Tab, falls du den Code genauer erklärt haben willst.",
        author: 'Helper-System - Coding Assistant',
        avatar: 'idea',
        tab: 'explanation',
      },
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-exclamation-sign'></span> <b>Compiler</b> findest du Erklärungen zu den Syntax-Fehlern im Code. Beachte, dass wenn du den Code via 'Run-Button' ausführst oder ihn via 'Test-Button' überprüfst, dieser Tab bei vorhandenen Syntax-Fehler automatisch aufgerufen wird.",
        author: 'Helper-System - Compiler-Meldungen',
        avatar: 'idea',
        tab: 'compiler',
      },
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-gift'></span> <b>Tipps</b> kannst du Hinweise zur finalen Lösung anfragen. Beachte, dass die Tipps abhängig vom aktuellen Stand deiner Lösung sind.",
        author: 'Helper-System - Tipps',
        avatar: 'idea',
        tab: 'tips',
      },
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-pencil'></span> <b>Fragen</b> steht dir zunächst ein KI-Assistent zur Verfügung, der dir bei allgemeinen Fragen oder beim Verständnis helfen kann. Falls du mit der Aufgabe dennoch gar nicht mehr weiterkommst, kannst du auch Fragen an Dozierende stellen.",
        author: 'Helper-System - Fragen',
        avatar: 'idea',
        tab: 'questions',
      },
      {
        type: 'info',
        message:
          "Im Tab <span class='glyphicon glyphicon-eye-open'></span> <b>Code-Review</b> findest du deine Code-Reviews. Das Review wird automatisch gestartet, nachdem du deine Lösung submitted hast.",
        author: 'Helper-System - Code-Review',
        avatar: 'idea',
        tab: 'codeReview',
      },
    ];

    // only add info chatLines which are not in disabledActions
    infoChatLines.forEach((chatLine) => {
      // for the code review we only show the info chat box if
      // the project is completed for roles !owner
      if (
        chatLine.tab === reviewTabSlug &&
        !ProjectFactory.getProject().projectCompleted &&
        $scope.currentRoleIsUser()
      ) {
        return;
      }
      // remove the questions info chatbox if both
      // the lecturer-qa and the ai-qa are disabled
      if (chatLine.tab === 'questions') {
        // check if the chatLine is a questions and do not add it if the project is not completed
        if ($scope.isActionHidden('ai-qa') && $scope.isActionHidden('lecturer-qa')) {
          return;
        }
      }

      // for other tabs we only need to check if the action
      // is hidden or not
      if (!$scope.isActionHidden(chatLine.tab)) {
        $scope.chatLines.push(chatLine);
      }
    });

    /**
     * if a submission was successful display the code-review chatbox in the review tab
     * this operation is only executed if the chatbox has to be displayed during runtime
     */
    $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
      const reviewInfoBox = infoChatLines.find((chatLine) => chatLine.tab === reviewTabSlug);
      const isAlreadyAdded = $scope.chatLines.some((chatLine) => chatLine.tab === reviewTabSlug);
      if (reviewInfoBox && !isAlreadyAdded) {
        $scope.chatLines.push(reviewInfoBox);
      }
    });
  },
]);
