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
    "$timeout",
    "IdeMsgService",
    "ProjectFactory",
    "AISrv",
    "ChatSrv",
    "UITexts",
    function ($scope, $rootScope, $routeParams, $timeout, IdeMsgService, ProjectFactory, AISrv, ChatSrv, UITexts) {
      const slug = "codeReview";
      const avatarName = "Roby";
      const chatBoxLimit = 1;
      const allChatBoxes = [];
      $scope.newestReviewChatLines = [];
      $scope.oldReviewChatLines = [];
      $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_INFO;
      $scope.reviewLoadingChatBoxTxt = UITexts.CODE_REVIEW_LOADING;
      $scope.hideShowMore = false;
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.reviewIsLoading = false;
      $scope.disableReviewBtn = false;

      let chatScrollToBottom = function() {
        $timeout(() => {
          document.getElementById("scroll-target-review").scrollIntoView({ behavior: "smooth" });
        })
      }

      let handleError = function(err) {
        $scope.errTxt = err;
        $scope.reviewIsLoading = false;
      }

      let addChatBoxToList = function(chatBox) {
        chatBox.author = chatBox.author.name || chatBox.author.username || "Roby";
        chatBox.avatar = chatBox.avatar || "idea";

        // add card to the list
        allChatBoxes.push(chatBox);        
      };

      // function to display the chatboxes in the UI
      let displayChatBoxes = function() {
        // if more chatboxes are available than the limit, update the UI accordingly
        if (allChatBoxes.length > chatBoxLimit) {              
          $scope.hideShowMore = false;
          $scope.oldChatBoxes = true;
          $scope.newestReviewChatLines = allChatBoxes.slice(-chatBoxLimit);
        } else {
          $scope.newestReviewChatLines = allChatBoxes;
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
                
        // scroll to the bottom of the chat history
        chatScrollToBottom();

        // remove the newest chatboxes from the array because it is already displayed
        $scope.oldReviewChatLines = allChatBoxes.slice(0, -chatBoxLimit);        
      }

      /**
       * function to start the code review
       */
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
                .then((data) => {
                  addChatBoxToList(data);

                  // disable the review button after a successful review
                  $scope.disableReviewBtn = true;
                  $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;

                  displayChatBoxes();
                })
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
              $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;
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

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab has to be enabled during runtime
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        // if the user makes a new submission we have to enable the review button
        $scope.disableReviewBtn = false;
        $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_INFO;
        
        let req = IdeMsgService.msgNavBarRightEnableTab("codeReview");
        $rootScope.$broadcast(req.msg, req.data);
        $scope.init();
      });
    },
  ]);
