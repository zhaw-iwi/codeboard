/**
 * This is the main controller for the navBarTab "explanation" - the controller will generate the explanation/error chatboxes (functionality for variable Scope and syntax-checker is in ide.js)
 *
 *
 * @author Samuel Truniger
 * @date 20.03.2023
 */
'use strict';
angular.module('codeboardApp').controller('ideNavBarRightCodingAssistantCtrl', [
  '$scope',
  '$timeout',
  'AceEditorSrv',
  '$routeParams',
  'AISrv',
  'UserSrv',
  'IdeMsgService',
  'ProjectFactory',
  'UITexts',
  function ($scope, $timeout, AceEditorSrv, $routeParams, AISrv, UserSrv, IdeMsgService, ProjectFactory, UITexts) {
    const aceEditor = $scope.ace.editor;
    var chatBoxes = [];
    var data = {};

    // holds all the code explanation chatboxes
    $scope.chatLines = [];
    $scope.expIsLoading = false;
    $scope.userRole = ProjectFactory.getProject().userRole;
    $scope.assistantInfoChatBoxTxt = UITexts.CODING_ASSISTANT_INFO;
    $scope.disableCABtn = false;
    $scope.avatarStyle = 'neutral';

    const handleLimitExceeded = function () {
      // disable the button and show a message
      $scope.avatarStyle = 'worried';
      $scope.disableCABtn = true;
      $scope.assistantInfoChatBoxTxt = UITexts.CODING_ASSISTANT_LIMIT_EXCEEDED;
    };

    // function to get the explantion of the selected code
    $scope.getCodeExplanation = async function () {
      try {
        // the selected code in the editor
        const selectedCode = AceEditorSrv.getSelectedCode(aceEditor).trim();

        // if no code is selected, show an error message
        if (selectedCode.length === 0) {
          $scope.errTxt = 'Bitte markiere den Code, den du dir erklären lassen möchtest.';
          $timeout(() => {
            $scope.errTxt = '';
          }, 2000);
          return;
        }

        $scope.expIsLoading = true;
        $scope.assistantInfoChatBoxTxt = UITexts.CODING_ASSISTANT_LOADING;
        data.code = AceEditorSrv.getInputCode(aceEditor);
        data.selCode = selectedCode;

        // request explanation from the backend (ai)
        // gpt should return -1 if no explanation is found or insufficient data (code) is provided
        const res = await AISrv.askForCodeExplanation($routeParams.courseId, $routeParams.projectId, data);
        const codeExplanation = res.answer;
        const remainingRequests = res.remainingRequests;

        if (codeExplanation) {
          $scope.expIsLoading = false;

          const chatBox = {
            type: 'explanation',
            cardTitle: 'Hallo! Nachfolgend findest du die Erklärung für den ausgewählten Code:',
            cardBody: codeExplanation,
            selectedCode: selectedCode,
            author: 'Roby',
            avatar: 'idea',
          };

          chatBoxes.unshift(chatBox);
        }

        // check if the user has reached the request limit
        if (remainingRequests <= 0) {
          handleLimitExceeded();
          // indicate in ide.js that the request limit is reached
          $scope.setRequestLimitReached();
        } else {
          $scope.assistantInfoChatBoxTxt = UITexts.CODING_ASSISTANT_INFO;
        }
        $scope.chatLines = chatBoxes;

        // manually updated the view
        $timeout(function () {});
      } catch (err) {
        $scope.expIsLoading = false;
        $scope.assistantInfoChatBoxTxt = UITexts.CODING_ASSISTANT_INFO;

        // handle request limit error:
        // this can happen if the user makes a request in one browser window,
        // which consumes their last available request,
        // and then, in a different window (without refreshing the page),
        // they attempt to make another request to the AI service.
        if (err.status === 429 && err.data.limitExceeded) {
          handleLimitExceeded();
          $timeout(function () {}, 0);
          // indicate in ide.js that the request limit is reached
          return $scope.setRequestLimitReached();
        }
        // all other errors
        $scope.errTxt = 'Fehler beim Laden der Erklärung.';

        $timeout(() => {
          $scope.errTxt = '';
        }, 2000);

        // ensure the digest cycle runs
        $timeout(function () {});
      }
    };

    // this event is triggered in the following case:
    // user is in a different tab and uses an ai service which results in no remaining requests
    // when the user then switches to this tab, we emit an event to show that the limit is reached
    $scope.$on(IdeMsgService.msgRequestLimitReached().msg, function () {
      handleLimitExceeded();
    });

    /**
     * init this tab by checking if the user has reached the request limit
     */
    $scope.init = async function () {
      const reqLimitReached = $scope.isRequestLimitReached();
      if (reqLimitReached) {
        handleLimitExceeded();
      }
    };
    $scope.init();
  },
]);
