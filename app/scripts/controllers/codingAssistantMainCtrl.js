/**
 * This is the main controller for the navBarTab "explanation" - the controller will generate the explanation/error chatboxes (functionality for variable Scope and syntax-checker is in ide.js)
 *
 *
 * @author Samuel Truniger
 * @date 20.03.2023
 */
"use strict";
angular.module("codeboardApp").controller("CodingAssistantMainCtrl", [
  "$scope",
  "$timeout",
  "AceEditorSrv",
  "$routeParams",
  "UserSrv",
  "AISrv",
  "ProjectFactory",
  function (
    $scope,
    $timeout,
    AceEditorSrv,
    $routeParams,
    UserSrv,
    AISrv,
    ProjectFactory
  ) {
    var aceEditor = $scope.ace.editor;
    var chatBoxes = [];
    var data = {};

    $scope.chatLines = [];
    $scope.showInfoMsg = true;
    $scope.expIsLoading = false;
    $scope.userRole = ProjectFactory.getProject().userRole;    

    // function to get the explantion of the selected code
    $scope.getCodeExplanation = function () {
      var selectedCode = AceEditorSrv.getSelectedCode(aceEditor);
      var inputCode = AceEditorSrv.getInputCode(aceEditor);
      data.code = inputCode;

      if (selectedCode.length === 0) {
        $scope.errTxt =
          "Bitte markiere den Code, den du dir erklären lassen möchtest.";
        $timeout(() => {
          $scope.errTxt = "";
        }, 2000);
      } else {
        $scope.expIsLoading = true;
        data.code = AceEditorSrv.getInputCode(aceEditor);
        data.selCode = selectedCode;

        // request explanation from the backend (ai)
        // gpt should return -1 if no explanation is found or insufficient data (code) is provided
        return AISrv.askForCodeExplanation(UserSrv.getUserId(), $routeParams.courseId, $routeParams.projectId, data)
          .then((res) => {
            const codeExplanation = res.answer;
            const userReqLimitExceeded = res.limitExceeded;
            
            if (codeExplanation) {
              $scope.showInfoMsg = false;
              $scope.expIsLoading = false;
              
              let chatBox = {
                type: "explanation",
                cardTitle: "Hallo! Nachfolgend findest du die Erklärung für den ausgewählten Code:",
                cardBody: codeExplanation,
                selectedCode: selectedCode,
                author: "Roby",
                avatar: "idea"
              }

              chatBoxes.unshift(chatBox);
            } else if (userReqLimitExceeded) {
              $scope.showInfoMsg = false;
              $scope.expIsLoading = false;
              
              let chatBox = {
                message: "Du hast dein Limit für Anfragen an den AI-Assistenten erreicht. Du kannst diesen Service ab nächster Woche wieder nutzen.",
                author: "Roby",
                avatar: "worried"
              }            
              chatBoxes.unshift(chatBox);  
            }

            $scope.chatLines = chatBoxes;
          })
          .catch((err) => {
            $scope.errTxt = err;
            $scope.expIsLoading = false;
          });
      }
    };
  },
]);
