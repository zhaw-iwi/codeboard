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
    'CodeboardSrv',
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
      CodeboardSrv,
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
      $scope.hideShowMoreBtn = true;
      $scope.displayOldChatBoxes = false;
      $scope.showShowMoreContent = false;
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
       * function which displays all the chatlines except for the newest ones
       */
      $scope.showMore = function () {
        $scope.hideShowMoreBtn = true;
        $scope.displayOldChatBoxes = true;

        // scroll to the bottom of the chat history
        chatScrollToBottom();

        // create a set of the IDs of the newest chat lines
        const newestIds = new Set($scope.newestQAChatLines.map((chatLine) => chatLine.id));

        // filter out chatlines that are in the newestQAChatLines
        $scope.oldQAChatLines = allChatBoxes.filter((chatLine) => !newestIds.has(chatLine.id));
      };

      /**
       * show send request form on click
       */
      $scope.showSendRequestForm = function () {
        $scope.sendRequestFormVisible = true;
      };

      /**
       * display the newest chatboxes (question+answer) by date
       */
      const displayNewestChatLines = function () {
        // get the newest chatbox by date
        const newestChatBox = allChatBoxes.reduce((prev, current) => {
          return prev.createdAt > current.createdAt ? prev : current;
        });

        // get the subjectId of the newest chatbox
        // for non chatbot help requests the subjectId is the id of the help request
        // in the help request table
        // for chatbot help requests the subjectId is generated below and is stored in the
        // message object of the chatbox
        const newestSubjectId = newestChatBox.subjectId || newestChatBox.message.cardReference;

        $scope.newestQAChatLines = allChatBoxes.filter((chatBox) => {
          return chatBox.subjectId === newestSubjectId || chatBox.message.cardReference === newestSubjectId;
        });

        // hide the old chatboxes each time a new chatbox is added
        $scope.displayOldChatBoxes = false;

        // display the show more content and show more button if all chatboxes
        // have more entries than the newest chatboxes
        if (allChatBoxes.length - $scope.newestQAChatLines.length > 0) {
          $scope.showShowMoreContent = true;
          $scope.hideShowMoreBtn = false;
        }
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
        }
        return chatLine.author.username === chatLine.user.username ? 'student' : 'teacher';
      };

      /**
       * This functions adds a chat line to the chatbox list
       * With the parameter 'scrollToBottom' whether or not the conversation box should be
       * scrolled to the bottom or not
       *
       * @param chatLine
       */
      const addChatBoxToList = function (chatLine) {
        // parse the message for all chatlines except for the help request answers
        // because those chatlines are not a chatline card
        if (chatLine.type !== 'helpRequestAnswer') {
          chatLine.message = JSON.parse(chatLine.message);
        }

        // update the reference of the chatline if it is a non chatbot help request
        if (chatLine.type === 'helpRequest' || chatLine.type === 'card') {
          chatLine.message.cardReference =
            ProjectFactory.getProject().userRole === 'user' ? null : chatLine.message.cardReference;
        }

        chatLine.avatar = getChatLineAvatar(chatLine);
        chatLine.author = chatLine.author.name || chatLine.author.username;
        chatLine.alignment = chatLine.authorId !== chatLine.userId ? 'left' : 'right';

        // add card to the list of chatboxes
        allChatBoxes.push(chatLine);

        // empty note field
        $scope.formData.noteStudent = '';
        $scope.formData.noteTeacher = '';
      };

      /**
       * Common method to handle the setup and saving of a question
       */
      const prepareAndSaveQuestion = async function () {
        const noteStudent = $scope.formData.noteStudent;

        // check if the input is empty
        if (!noteStudent || noteStudent === '' || typeof noteStudent === 'undefined') {
          $scope.sendHelpFormErrors = UITexts.QA_NO_INPUT_QUESTION;
          return false;
        }

        // hide the send request form
        $scope.sendRequestFormVisible = false;
        
        // trigger a save of the currently displayed content (code)
        // save the all files in project to db
        if ($scope.ace.currentNodeId !== -1) {
          // if the value is !== -1, then some tab is open
          // update the content of the current node with the current
          // content of the ace editor
          ProjectFactory.getNode($scope.ace.currentNodeId).content = $scope.ace.editor.getSession().getValue();
        }
        await ProjectFactory.saveProjectToServer();

        return noteStudent;
      };

      /**
       * This method is called by a student requires help for a project and wants to ask the lecturer.
       * First create a new 'helpRequest' and then add a new chatline with reference
       * to the helpRequest.
       * @returns {*}
       */
      $scope.askLecturer = async function () {
        try {
          const noteStudent = await prepareAndSaveQuestion();
          if (!noteStudent) {
            return;
          }

          // call ProjectFactory to store the request (in the help request table)
          const helpRequest = await ProjectFactory.createHelpRequest();
          // helprequest.id is the id of the helprequest in the helpRequest table
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
            displayNewestChatLines();
          });
        } catch (err) {
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_QUESTION;
        }
      };

      /**
       * Helper function to create a unique ID for the chatbot conversation.
       * We do this because no subjectId is generated for the chatbot conversation.
       * @returns {string} unique ID for the chatbot conversation
       */
      const createChatbotConversationId = function () {
        return 'chatbot-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      };

      /**
       * This method is called by a student requires help for a project and wants to ask the chatbot.
       * Instead of creating a new helpRequest as in askLecturer(), we create a new chatLine with type 'helpChatbot'
       * to the helpRequest.
       * @returns {*}
       */
      $scope.askChatbot = async function () {
        try {
          const noteStudent = await prepareAndSaveQuestion();
          if (!noteStudent) {
            return;
          }

          // generate a unique ID for the chatbot conversation
          const subjectId = createChatbotConversationId();

          // the user query chatbox
          // store the chatbox in the db (to do: add avatar)
          const chatLineStud = await ChatSrv.addChatLineCard(
            noteStudent,
            'Hilfe angefragt (chatbot)',
            'helpChatbot',
            subjectId
          );
          addChatBoxToList(chatLineStud);

          // the placeholder chatbot answer chatbox
          // store the chatbox in the db
          const noteChatbot = 'Deine Frage wird geprüft. Ich melde mich gleich...';
          const chatLineBot = await ChatSrv.addChatLineCard(
            noteChatbot,
            null,
            'helpChatbotAnswer',
            subjectId,
            null,
            'Roby'
          );
          addChatBoxToList(chatLineBot);

          // display the new question and llm answer placeholder
          displayNewestChatLines();

          // load the chatbot answer and update chatbox in backend
          const data = {
            query: noteStudent,
            chatLineId: chatLineBot.id,
          };

          const updatedChatLine = await AISrv.askForHelp($routeParams.courseId, $routeParams.projectId, data);

          // update the content of the chatbot answer chatbox
          $scope.newestQAChatLines[1].message.cardBody = updatedChatLine.answer;

          // manually update the scope (UI)
          $timeout(function () {});
        } catch (err) {
          // handle error if request limit is reached
          if (err.status === 429 && err.data.limitExceeded) {
            $scope.newestQAChatLines[1].message.cardBody = UITexts.QA_CHATBOT_LIMIT_EXCEEDED;
            // to do: update the chatbox in the backend

            $timeout(function () {});
          }
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_QUESTION;
        }
      };

      /**
       * get the subjectId of the newest help request
       * subjectId is only generated for help requests not for chatbots
       * each help request then has a subjectId which is the same for the question and the answer
       */
      const getNewestSubjectId = function () {
        return Math.max(...allChatBoxes.map((chatBox) => chatBox.subjectId));
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
          const id = lastHelpRequest ? lastHelpRequest.id : getNewestSubjectId();

          // store the chatbox in the db
          const chatLine = await ChatSrv.addChatLine(noteTeacher, id, UserSrv.getUsername(), 'helpRequestAnswer');

          addChatBoxToList(chatLine);

          // manually update the scope (UI)
          $timeout(() => {
            displayNewestChatLines();
          });
        } catch (err) {
          $scope.sendHelpFormErrors = UITexts.QA_ERROR_ANSWER;
        }
      };

      /**
       * checks wheter 'lecturer-qa' or 'ai-qa' is disabled
       * enabled checks if there is an entry in codeboard.json
       * disabled checks if there is an entry in course settings
       */
      $scope.isActionDisabled = function (action) {
        let actionDisabled = CodeboardSrv.checkDisabledActions(action);
        let actionEnabled = CodeboardSrv.checkEnabledActions(action);

        if (actionDisabled && !actionEnabled) {
          return true;
        } else {
          return false;
        }
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
              const req = IdeMsgService.msgNavBarRightOpenTab('questions');
              $rootScope.$broadcast(req.msg, req.data);
            }, 500);
          }

          // load chat history and display the chatboxes
          const history = await ChatSrv.getChatHistory();
          // filter all the chatLines that are relevant for the Q&A tab
          // (we need all those checks because chatLines types where different in earlier versions)
          const data = history.data.filter(
            (chatLine) =>
              chatLine.type === 'helpRequest' ||
              chatLine.type === 'helpRequestAnswer' ||
              chatLine.type === 'helpChatbot' ||
              chatLine.type === 'helpChatbotAnswer' ||
              chatLine.type === 'html' || // old type for help requests
              (chatLine.type === 'card' && chatLine.message.cardType === 'help') // old type for help requests
          );

          // add all chatlines to the chatbox list
          data.forEach((chatLine) => {
            addChatBoxToList(chatLine);
          });

          // after the chatboxes are preapred, display the newest chatboxes
          $timeout(() => {
            displayNewestChatLines();
          });
        } catch (err) {
          console.log('Fehler beim Laden des Chatverlaufs!');
        }
      };

      // init the tab (gets called from ide.js when tab is not hidden)
      $scope.init();
    },
  ]);
