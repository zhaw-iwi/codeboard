/**
 * @author Samuel Truniger
 * @date 09.09.2024
 */

"use strict";

angular
  .module("codeboardApp")

  /**
   * Controller for the Code-Review tab
   */
  .controller("ideNavBarRightCodeReviewCtrl", [
    "$scope",
    "$rootScope",
    "$routeParams",
    "IdeMsgService",
    "ProjectFactory",
    "AISrv",
    "ChatSrv",
    function ($scope, $rootScope, $routeParams, IdeMsgService, ProjectFactory, AISrv, ChatSrv) {
      const slug = "codeReview";
      const avatarName = "Roby";
      $scope.reviewIsLoading = false;
      $scope.chatLines = [];

      $scope.init = function () {
        // check if the user already has a submission of the project or if the user is not of type `user` (e.g. `owner`)
        if (ProjectFactory.getProject().projectCompleted || ProjectFactory.getProject().userRole !== "user") {
          $scope.userRole = ProjectFactory.getProject().userRole;

          // get the chat history and filter out the code review chatboxes
          ChatSrv.getChatHistory().then((res) => {
            res.data.forEach((chatLine) => {
              if (chatLine.type === "codeReview") {
                addChatLine(chatLine);
              }
            });
          });
        } else {
          // if no submission is present broadcast an event to disable the tab
          let req = IdeMsgService.msgNavBarRightDisableTab(slug);
          $rootScope.$broadcast(req.msg, req.data);
        }
      };

      // init this tab
      $scope.init();

      // function to start the code review
      $scope.startCodeReview = function () {
        $scope.reviewIsLoading = true;

        return AISrv.askForCodeReview($routeParams.courseId, $routeParams.projectId)
          .then((res) => {
            const codeReview = res.answer;
            const userReqLimitExceeded = res.limitExceeded;

            // if we get a code review from the AI service, add it to the chat
            if (codeReview) {
              $scope.reviewIsLoading = false;

              return ChatSrv.addChatLine(codeReview, null, avatarName, "codeReview")
                .then((res) => {
                  addChatLine(res);
                })
                .catch((err) => {
                  $scope.errTxt = err;
                  $scope.reviewIsLoading = false;
                });
            } else if (userReqLimitExceeded) {
              $scope.reviewIsLoading = false;

              let chatBox = {
                message: "Du hast dein Limit für Anfragen an den AI-Assistenten erreicht. Du kannst diesen Service ab nächster Woche wieder nutzen.",
                author: "Roby",
                avatar: "worried",
              };
              addChatLine(chatBox);
            }
          })
          .catch((err) => {
            $scope.errTxt = err;
            $scope.reviewIsLoading = false;
          });
      };

      let addChatLine = function (chatBox) {
        chatBox.message = chatBox.message;
        chatBox.author = chatBox.author.name || chatBox.author.username;
        chatBox.avatar = "idea";

        // add card to the list
        $scope.chatLines.unshift(chatBox);
      };

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab has to be enabled during runtime
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        let req = IdeMsgService.msgNavBarRightEnableTab("codeReview");
        $rootScope.$broadcast(req.msg, req.data);
        $scope.init();
      });
    },
  ]);
