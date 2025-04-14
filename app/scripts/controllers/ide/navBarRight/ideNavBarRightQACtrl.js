/**
 * This is the controller for the navBarTab Q&A Tab.
 *
 * @author Samuel Truniger
 * @date 11.09.2024
 */

'use strict';

angular
  .module('codeboardApp')

  /**
   * Controller for the Q&A tab
   */
  .controller('ideNavBarRightQACtrl', [
    '$scope',
    '$rootScope',
    '$routeParams',
    '$timeout',
    'IdeMsgService',
    'ProjectFactory',
    'ChatSrv',
    'UserSrv',
    'AISrv',
    'UITexts',
    function (
      $scope,
      $rootScope,
      $routeParams,
      $timeout,
      IdeMsgService,
      ProjectFactory,
      ChatSrv,
      UserSrv,
      AISrv,
      UITexts
    ) {
      // scope variables
      $scope.newestQAChatLines = [];
      $scope.oldQAChatLines = [];
      $scope.chatLines = [];
      $scope.sendRequestFormVisible = false;
      $scope.qaInfoChatBoxTxt = UITexts.QA_INFO;
      $scope.oldChatBoxes = false;
      $scope.hideShowMore = false;
      $scope.displayOldChatBoxes = false;
      $scope.formData = {
        noteStudent: '',
        noteTeacher: '',
      };

      // other variables
      const avatarName = 'Roby';
      const allChatBoxes = [];

      /**
       * if the show more button is pressed scroll to the bottom of the chat history
       */
      const chatScrollToBottom = function () {
        $timeout(() => {
          document.getElementById('scroll-target-qa').scrollIntoView({ behavior: 'smooth' });
        });
      };

      /**
       * get the subjectId (reference to answer) of the newest help request
       */
      const getNewestSubjectId = function () {
        return Math.max(...allChatBoxes.map((chatBox) => chatBox.subjectId));
      };

      /**
       * get the newest chatboxes (question+answer) by date
       */
      const getNewestChatBoxes = function () {
        // filter all chatboxes that are not the newest ones by date (createdAt)
        return allChatBoxes.filter((chatBox) => chatBox.subjectId === getNewestSubjectId());
      };

      /**
       * Returns the url to an avatar depending on user und message
       *
       * @param chatLine
       * @returns {string}
       */
      const getChatLineAvatar = function (chatLine) {
        if (chatLine.author.username === avatarName) {
          return 'neutral';
        } else {
          return chatLine.author.username === chatLine.user.username ? 'student' : 'teacher';
        }
      };

      /**
       * This functions adds a chat line to the chatbox list
       * With the parameter 'scrollToBottom' whether or not the conversation box should be
       * scrolled to the bottom or not
       *
       * @param chatLine
       */
      const addChatBoxToList = function (chatLine) {
        // if chatLine type `helpRequest`, parse the message
        if (chatLine.type === 'helpRequest' || chatLine.type === 'card') {
          chatLine.message = JSON.parse(chatLine.message);
          chatLine.message.cardReference =
            ProjectFactory.getProject().userRole === 'user' ? null : chatLine.message.cardReference;
        }

        chatLine.avatar = getChatLineAvatar(chatLine);
        chatLine.author = chatLine.author.name || chatLine.author.username;
        chatLine.alignment = chatLine.authorId !== chatLine.userId ? 'left' : 'right';

        // add card to the list
        allChatBoxes.push(chatLine);

        // re-empty note field
        $scope.formData.noteStudent = '';
        $scope.formData.noteTeacher = '';
      };

      // function to display the chatboxes
      const displayChatBoxes = function () {
        // show the newest chatboxes (question+answer) in the view
        $scope.newestQAChatLines = getNewestChatBoxes();

        // check if there are multiple different subjectIds in allChatBoxes
        const uniqueSubjectIds = [...new Set(allChatBoxes.map((chatBox) => chatBox.subjectId))];

        // if there are multiple different subjectIds show the "display more" button
        $scope.oldChatBoxes = uniqueSubjectIds.length > 1;
        if ($scope.oldChatBoxes) {
          $scope.hideShowMore = false;
        } else {
          $scope.hideShowMore = true;
        }

        // hide the old chatboxes each time a new chatbox is added
        $scope.displayOldChatBoxes = false;
      };

      /**
       * This method is called by a student requires help for a project and wants to ask the lecturer.
       * First create a new 'helpRequest' and then add a new chatline with reference
       * to the helpRequest.
       * @returns {*}
       */
      $scope.askLecturer = async function () {
        try {
          const noteStudent = $scope.formData.noteStudent;

          // check if the input is empty
          if (!noteStudent || noteStudent === '' || typeof noteStudent === 'undefined') {
            $scope.sendHelpFormErrors = UITexts.QA_NO_INPUT_QUESTION;
            return false;
          }

          // trigger a save of the currently displayed content (code)
          // save the all files in project to db
          if ($scope.ace.currentNodeId !== -1) {
            // if the value is !== -1, then some tab is open
            ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
          }
          await ProjectFactory.saveProjectToServer();

          // call ProjectFactory to store the request (in the help request table)
          const helpRequest = await ProjectFactory.createHelpRequest();
          const reference = '/projects/' + helpRequest.projectId + '/helprequests/' + helpRequest.id;

          // store the chatbox in the db
          const aChatLine = await ChatSrv.addChatLineCard(
            noteStudent,
            'Hilfe angefragt',
            'help',
            reference,
            helpRequest.id
          );

          addChatBoxToList(aChatLine);

          // manually update the scope (UI)
          $timeout(() => {
            displayChatBoxes();
          });

          $scope.sendRequestFormVisible = false;
        } catch (err) {
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_QUESTION;
        }
      };

      /**
       * This method is called by a student requires help for a project and wants to ask the chatbot.
       * Instead of creating a new helpRequest as in askLecturer(), we create a new chatLine with type 'helpRequestChatbot'
       * to the helpRequest.
       * @returns {*}
       */
      $scope.askChatbot = async function () {
        try {
          const noteStudent = $scope.formData.noteStudent;

          // check if the input is empty
          if (!noteStudent || noteStudent === '' || typeof noteStudent === 'undefined') {
            $scope.sendHelpFormErrors = UITexts.QA_NO_INPUT_QUESTION;
            return;
          }

          // trigger a save of the currently displayed content (code)
          // save the all files in project to db
          if ($scope.ace.currentNodeId !== -1) {
            // if the value is !== -1, then some tab is open
            ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
          }
          await ProjectFactory.saveProjectToServer();

          // the user query chatbox
          // store the chatbox in the db (to do: add avatar)
          const chatLineStud = await ChatSrv.addChatLine(noteStudent, null, null, 'helpRequestChatbot');
          addChatBoxToList(chatLineStud);

          // the chatbot answer chatbox
          // store the chatbox in the db
          const noteChatbot = 'Deine Frage wird geprüft. Ich melde mich gleich...';
          const chatLineBot = await ChatSrv.addChatLine(noteChatbot, null, 'Roby', 'helpRequestChatbotAnswer');
          addChatBoxToList(chatLineBot);

          // workaround because we have no subjectId (just for demo)
          $scope.newestQAChatLines = [chatLineStud, chatLineBot];

          $scope.sendRequestFormVisible = false;

          // load the chatbot answer and update chatbox in backend
          const data = {
            query: noteStudent,
            chatLineId: chatLineBot.id,
          };

          const updatedChatLine = await AISrv.askForHelp($routeParams.courseId, $routeParams.projectId, data);

          // to do: check for request limit exceeded

          // update the content of the chatbot answer chatbox
          $scope.newestQAChatLines[1].message = updatedChatLine.answer;

          // displayChatBoxes();

          // manually update the scope (UI)
          $timeout(function () {});
        } catch (err) {
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_QUESTION;
        }
      };

      /**
       * This method is called by a teacher to answer a students help request.
       * By doing so we first check the for valid message. Next we search for open
       * helpRequests and extract id of latest request. Then add new chatline with
       * reference to this request.
       */
      $scope.answerHelpRequest = async function () {
        try {
          let noteTeacher = $scope.formData.noteTeacher;

          // check if the input is empty
          if (!noteTeacher || noteTeacher === '' || typeof noteTeacher === 'undefined') {
            $scope.sendHelpFormErrors = UITexts.QA_NO_INPUT_ANSWER;
            return false;
          }

          // filter all chatlines with status unanswered
          let chatLinesUnanswered = allChatBoxes.filter((chatLine) => {
            return chatLine.subject && chatLine.subject.status === 'unanswered';
          });

          let lastHelpRequest = null;
          // set status of all unanswered help requests to answered
          for (let chatLine of chatLinesUnanswered) {
            lastHelpRequest = await ProjectFactory.updateHelpRequest(chatLine.subjectId);
          }

          // if there is no unanswered help request, get the id of the newest help request
          let id = lastHelpRequest ? lastHelpRequest.id : getNewestSubjectId();

          // store the chatbox in the db
          const chatLine = await ChatSrv.addChatLine(noteTeacher, id, UserSrv.getUsername(), 'helpRequestAnswer');

          addChatBoxToList(chatLine);

          // manually update the scope (UI)
          $timeout(() => {
            displayChatBoxes();
          });
        } catch (err) {
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_ANSWER;
        }
      };

      // function which loads all the chatboxes that are not displayed
      $scope.showMore = function () {
        $scope.hideShowMore = true;
        $scope.displayOldChatBoxes = true;

        // scroll to the bottom of the chat history
        chatScrollToBottom();

        $scope.newestQAChatLines = getNewestChatBoxes();
        // display all chatboxes that are not the newest ones
        $scope.oldQAChatLines = allChatBoxes.filter((chatBox) => chatBox.subjectId !== getNewestSubjectId());
      };

      /**
       * Show send request form on click
       */
      $scope.showSendRequestForm = function () {
        $scope.sendRequestFormVisible = true;
      };

      /**
       * init this tab by loading chat history and read tips
       */
      $scope.init = async function () {
        try {
          // only show "Frage stellen" button if user a student
          $scope.sendRequestFormVisible = !$scope.currentRoleIsUser();

          // when user role help, make q&a-tab default tab > case when owner wants to answer questions
          if (ProjectFactory.getProject().userRole === 'help') {
            $timeout(() => {
              let req = IdeMsgService.msgNavBarRightOpenTab('questions');
              $rootScope.$broadcast(req.msg, req.data);
            }, 500);
          }

          // load chat history and display the chatboxes
          const history = await ChatSrv.getChatHistory();
          // filter all the chatLines that are relevant for the Q&A tab (we need all those checks because chatLines types where different in earlier versions)
          const data = history.data.filter(
            (chatLine) =>
              chatLine.type === 'helpRequest' ||
              chatLine.type === 'helpRequestAnswer' ||
              chatLine.type === 'helpRequestChatbot' ||
              chatLine.type === 'helpRequestChatbotAnswer' ||
              chatLine.type === 'html' || // old type for help request
              (chatLine.type === 'card' && chatLine.message.cardType === 'help') // old type for help request
          );

          data.forEach((chatLine) => {
            addChatBoxToList(chatLine);
          });

          // after the chatboxes are preapred, display them
          $timeout(() => {
            displayChatBoxes();
          });
        } catch (err) {
          console.log('Fehler beim Laden des Chatverlaufs!');
        }
      };

      // init the tab (gets called from ide.js when tab is not hidden)
      $scope.init();
    },
  ]);
