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
    "UITexts",
    function ($scope, $rootScope, $routeParams, IdeMsgService, ProjectFactory, AISrv, ChatSrv, UITexts) {
      const slug = "codeReview";
      const avatarName = "Roby";
      const chatBoxLimit = 1;
      var allChatBoxes = [];
      $scope.newestChatLines = [];
      $scope.oldChatLines = [];
      $scope.infoChatBoxTxt = UITexts.CODE_REVIEW_INFO;
      $scope.hideShowMore = false;
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.reviewIsLoading = false;
      $scope.disableReviewBtn = false;

      $scope.init = function () {
        $scope.disableReviewBtn = true; 
        const project = ProjectFactory.getProject();
        // check if the user already has a submission of the project or if the user is not of type `user` (e.g. `owner`)
        if (project.projectCompleted || project.userRole !== "user") {
          $scope.userRole = project.userRole;

          // get the chat history and filter out the code review chatboxes
          ChatSrv.getChatHistory().then((res) => {
            let data = res.data;
            data = data
              .filter(chatBox => chatBox.type === "codeReview")
              .map(chatBox => ({ ...chatBox, avatar: "idea" }));
            
            data.forEach((chatLine) => {
              addChatBoxToList(chatLine);
            });
            
            // display the chatboxes after they were added to the list
            displayChatBoxes();

            // check if the last submission has a code review to disable the button for a new review
            if (project.lastSubmissionHasReview) {
              $scope.disableReviewBtn = true;
              $scope.infoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;
            } else {
              $scope.disableReviewBtn = false; 
            }
          }).catch((err) => {
            handleError(err);
          })      
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

              // store the chatbox in the db
              return ChatSrv.addChatLine(codeReview, null, avatarName, "codeReview")
                .then((res) => {
                  const data = res;                  
                  addChatBoxToList(data);
                  displayChatBoxes();

                  // disable the review button after a successful review
                  $scope.disableReviewBtn = true;
                  $scope.infoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;
                })
                .catch((err) => {
                  handleError(err);
                });
            } else if (userReqLimitExceeded) {
              $scope.reviewIsLoading = false;

              let chatBox = {
                message: "Du hast dein Limit für Anfragen an den AI-Assistenten erreicht. Du kannst diesen Service ab nächster Woche wieder nutzen.",
                author: "Roby",
                avatar: "worried",
              };
              addChatBoxToList(chatBox);
              displayChatBoxes();
            }
          })
          .catch((err) => {
            handleError(err);
          });
      };

      let addChatBoxToList = function (chatBox) {
        chatBox.author = chatBox.author.name || chatBox.author.username || "Roby";
        chatBox.avatar = chatBox.avatar || "idea";

        // add card to the list
        allChatBoxes.unshift(chatBox);
      };

      // function to display the chatboxes in the UI
      let displayChatBoxes = function () {
        // if more chatboxes are available than the limit, update the UI accordingly
        if (allChatBoxes.length > chatBoxLimit) {
          $scope.hideShowMore = false;
          $scope.oldChatBoxes = true;
          $scope.newestChatLines = allChatBoxes.slice(0, chatBoxLimit);
        } else {
          $scope.newestChatLines = allChatBoxes;
          $scope.hideShowMore = true;
          $scope.oldChatBoxes = false;
        }
        // hide the old chatboxes every time a new chatbox was added
        $scope.displayOldChatBoxes = false;
      };

      // function which gets called when user wants to display all code-reviews
      $scope.showMore = function() {        
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;
        // remove the newest chatboxes from the array because it is already displayed
        $scope.oldChatLines = allChatBoxes.slice(chatBoxLimit);
      }

      let handleError = function(err) {
        $scope.errTxt = err;
        $scope.reviewIsLoading = false;
      }

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab has to be enabled during runtime
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        // if the user makes a new submission we have to enable the review button
        $scope.disableReviewBtn = false;
        $scope.infoChatBoxTxt = UITexts.CODE_REVIEW_INFO;
        
        let req = IdeMsgService.msgNavBarRightEnableTab("codeReview");
        $rootScope.$broadcast(req.msg, req.data);
        $scope.init();
      });
    },
  ]);
