/**
 *
 * @author Janick Michot
 */

'use strict';

angular.module('codeboardApp').service('ChatSrv', [
  '$routeParams',
  '$q',
  'ChatRes',
  'ChatLineRes',
  'UserSrv',
  'ProjectFactory',
  function ChatService($routeParams, $q, ChatRes, ChatLineRes, UserSrv, ProjectFactory) {
    /**
     * This function stores a chatbox in the db
     * It is directly called when a chatbox without a header, type or reference is created
     * It is also called from addChatLineCard with the card (header, msg, type, etc.) as aMessage
     * @param aMessage The message of the chat box (is an object when chatLineCard)
     * @param helpRequestId The id of the help request to which the message belongs
     * @param user The user who sent the message
     * @param type The type of the message (text, helpRequest, hint, codeReview, etc.)
     * @returns {*}
     */
    const addChatLine = function (aMessage, helpRequestId = null, user = null, type = 'text') {
      // data used for this call
      const username = ProjectFactory.getProject().userBeingInspected || UserSrv.getUsername();
      const projectId = $routeParams.projectId;
      const payload = {
        aMessage: typeof aMessage === 'object' ? JSON.stringify(aMessage) : aMessage,
        author: user || UserSrv.getUsername(),
        type: type, // the type of the message as stored in the db column 'type'
        helpRequestId: helpRequestId,
      };

      // create the promise that is returned
      let deferred = $q.defer();

      // make call to the server
      ChatRes.save(
        { projectId: projectId, username: username },
        payload,
        function success(data) {
          deferred.resolve(data);
        },
        function error(response) {
          deferred.reject(response);
        }
      );
      return deferred.promise;
    };

    /**
     * Creates a chat line with type card used for 'helprequests' and 'tips'
     * This function is called when a chatbox with a header, type and reference is created
     *
     * @param aMessage the content of the card
     * @param aHeader the header (title) of the card
     * @param aType the type of the card (help, tip)
     * @param aReference the reference of the card (shows to which project the help request belongs)
     * @param helpRequestId the id of the help request to which the message belongs (subjectId)
     * @param user the user who sent the message
     * @param aStatus the status of the tip (sent, not sent)
     * @param aTipIndex the index of the default tip
     * @returns {*}
     */
    const addChatLineCard = function (
      aMessage,
      aHeader,
      aType = 'help',
      aReference = null,
      helpRequestId = null,
      user = null,
      aStatus = null,
      aTipIndex = null
    ) {
      // prepare card (message part (stored in message column in db))
      let card = {
        cardHeader: aHeader,
        cardBody: aMessage,
        cardType: aType,
        cardReference: aReference,
      };
      if (aType === 'tip') {
        card.tipSent = aStatus;
        card.tipIndex = aTipIndex;

        // if aStatus is not null it means that it is a default hint
        const type = aStatus ? 'hint' : 'hintChatbot';

        // add chatline for tips
        return addChatLine(JSON.stringify(card), helpRequestId, user, type);
      } else if (aType === 'help') {
        // add chatline for helprequests
        return addChatLine(JSON.stringify(card), helpRequestId, user, 'helpRequest');
      }
    };

    /**
     * Retrieve chat history
     * @returns {*}
     */
    const getChatHistory = function () {
      // data used for this call
      let username = ProjectFactory.getProject().userBeingInspected || UserSrv.getUsername(),
        projectId = $routeParams.projectId,
        payload = {};

      // create the promise that is returned
      let deferred = $q.defer();

      // make call to the server
      ChatRes.get(
        { projectId: projectId, username: username },
        payload,
        function success(data) {
          deferred.resolve(data);
        },
        function error(response) {
          // console.log(response);
          deferred.reject(response);
        }
      );
      return deferred.promise;
    };

    /**
     * Rate a compilation error message
     * todo This method should be replaced when the chat is rebuilt
     * @param chatMessageId
     * @param rate
     */
    const rateCompilationErrorMessage = function (chatMessageId, rate) {
      let deferred = $q.defer();
      ChatLineRes.update(
        { chatLineId: chatMessageId },
        { rating: rate },
        function success(data, status, header, config) {
          deferred.resolve();
        },
        function error(data, status, header, config) {
          deferred.reject();
        }
      );
      return deferred.promise;
    };

    return {
      getChatHistory: getChatHistory,
      addChatLine: addChatLine,
      addChatLineCard: addChatLineCard,
      rateCompilationErrorMessage: rateCompilationErrorMessage,
    };
  },
]);
