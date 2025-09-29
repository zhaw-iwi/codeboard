/**
 * @author Samuel Truniger
 * @date 09.09.2024
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for the Code-Review tab
   */
  .controller('ideNavBarRightCodeReviewCtrl', [
    '$scope',
    '$rootScope',
    '$routeParams',
    '$timeout',
    'IdeMsgService',
    'ProjectFactory',
    'AISrv',
    'ChatSrv',
    'UITexts',
    function ($scope, $rootScope, $routeParams, $timeout, IdeMsgService, ProjectFactory, AISrv, ChatSrv, UITexts) {
      $scope.newestReviewChatLines = [];
      $scope.oldReviewChatLines = [];
      $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_INFO;
      $scope.reviewLoadingChatBoxTxt = UITexts.CODE_REVIEW_LOADING;
      $scope.hideShowMore = false;
      $scope.oldChatBoxes = false;
      $scope.displayOldChatBoxes = false;
      $scope.reviewIsLoading = false;
      $scope.disableReviewBtn = false;

      // other variables
      const avatarName = 'Roby';
      const chatBoxLimit = 1;
      var allChatBoxes = [];

      const chatScrollToBottom = function () {
        $timeout(() => {
          document.getElementById('scroll-target-review').scrollIntoView({ behavior: 'smooth' });
        });
      };

      const handleError = function (err) {
        $scope.errTxt = err ? err.message : 'Fehler beim laden des Code-Reviews';
        $scope.reviewIsLoading = false;
      };

      const addChatBoxToList = function (chatBox) {
        chatBox.author = chatBox.author.name || chatBox.author.username || 'Roby';
        chatBox.avatar = chatBox.avatar || 'idea';

        // add card to the list
        allChatBoxes.push(chatBox);
      };

      // function to display the chatboxes in the UI
      const displayChatBoxes = function () {
        // if more chatboxes are available than the limit, update the UI accordingly
        if (allChatBoxes.length > chatBoxLimit) {
          $scope.hideShowMore = false;
          $scope.oldChatBoxes = true;
          // get the last chatboxes from the array
          $scope.newestReviewChatLines = allChatBoxes.slice(-chatBoxLimit);
        } else {
          // display all chatboxes
          $scope.newestReviewChatLines = allChatBoxes;
          $scope.hideShowMore = true;
          $scope.oldChatBoxes = false;
        }
        // hide the old chatboxes every time a new chatbox was added
        $scope.displayOldChatBoxes = false;
      };

      // function which gets called when user wants to display all code-reviews
      $scope.showMore = function () {
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;

        // scroll to the bottom of the chat history
        chatScrollToBottom();

        // remove the newest (last) chatboxes from the array because they are already displayed
        $scope.oldReviewChatLines = allChatBoxes.slice(0, -chatBoxLimit);
      };

      /**
       * function to start the code review
       * this function is no longer used because the code review is
       * initiated in ide.js after a successful submission
       * to do: delete function
       */
      // $scope.startCodeReview = async function () {
      //   try {
      //     $scope.reviewIsLoading = true;

      //     const res = await AISrv.askForCodeReview($routeParams.courseId, $routeParams.projectId);
      //     const codeReview = res.answer;
      //     const userReqLimitExceeded = res.limitExceeded;

      //     // if we get a code review from the AI service, add it to the chat
      //     if (codeReview) {
      //       $scope.reviewIsLoading = false;

      //       // store the chatbox in the db
      //       const chatBox = await ChatSrv.addChatLine(codeReview, null, avatarName, 'codeReview');
      //       addChatBoxToList(chatBox);

      //       // disable the review button after a successful review
      //       $scope.disableReviewBtn = true;
      //       $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;
      //     } else if (userReqLimitExceeded) {
      //       // if the user has reached the limit for code reviews, display a message in the chat
      //       $scope.reviewIsLoading = false;

      //       const chatBox = {
      //         message:
      //           'Du hast dein Limit für Anfragen an den AI-Assistenten erreicht. Du kannst diesen Service ab nächster Woche wieder nutzen.',
      //         author: 'Roby',
      //         avatar: 'worried',
      //       };
      //       addChatBoxToList(chatBox);
      //     }

      //     // display the chatboxes after they were added to the list
      //     $timeout(() => {
      //       displayChatBoxes();
      //     });
      //   } catch (err) {
      //     handleError(err);
      //   }
      // };

      $scope.init = async function () {
        // we have to empty the allChatBoxes array to avoid duplicates
        try {
          allChatBoxes = [];

          // $scope.disableReviewBtn = true;
          const project = ProjectFactory.getProject();

          $scope.userRole = project.userRole;

          // get the chat history and filter out the code review chatboxes
          const history = await ChatSrv.getChatHistory();
          const data = history.data
            .filter((chatBox) => chatBox.type === 'codeReview')
            .map((chatBox) => ({ ...chatBox, avatar: 'idea' }));

          if (data.length > 0) {
            data.forEach((chatLine) => {
              addChatBoxToList(chatLine);
            });
          }

          // display the chatboxes after they were added to the list
          displayChatBoxes();

          // check if the last submission has a code review to disable the button for a new review
          // if (project.lastSubmissionHasReview) {
          //   $scope.disableReviewBtn = true;
          //   $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_DISABLED;
          // } else {
          //   $scope.disableReviewBtn = false;
          // }
        } catch (err) {
          handleError(err);
        }
      };

      // init this tab (gets called when the tab is not hidden from ide.js > line 2586)
      $scope.init();

      /**
       * if a submission was successful initialize the tab
       * this operation is only executed if the tab has
       * to be enabled during runtime (e.g. when disabled before successful submission)
       * but the tab is not hidden
       */
      $scope.$on(IdeMsgService.msgSuccessfulSubmission().msg, function () {
        // if the user makes a new submission we have to enable the review button
        // $scope.disableReviewBtn = false;
        $scope.reviewInfoChatBoxTxt = UITexts.CODE_REVIEW_INFO;

        let req = IdeMsgService.msgNavBarRightEnableTab('codeReview');
        $rootScope.$broadcast(req.msg, req.data);

        // we need to reinitialize the tab to get the new chat history
        $scope.init();
      });
    },
  ]);
