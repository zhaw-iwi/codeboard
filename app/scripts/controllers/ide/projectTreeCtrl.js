/**
 * Controller for the tree view (left part which contains the project files) of the IDE.
 */
app.controller('ProjectTreeCtrl', [
  '$scope',
  '$rootScope',
  '$log',
  'ProjectFactory',
  'IdeMsgService',
  function ($scope, $rootScope, $log, ProjectFactory, IdeMsgService) {
    $scope.projectNodes = ProjectFactory.getProject().files;

    /**
     * Adds a new file to the project model (which feeds the tree view)
     */
    $scope.addFile = function () {
      var req = IdeMsgService.msgNewNodeRequest('file');
      $rootScope.$broadcast(req.msg, req.data);
    };

    /**
     * Adds a new folder to the project model (which feeds the tree view)
     */
    $scope.addFolder = function () {
      var req = IdeMsgService.msgNewNodeRequest('folder');
      $rootScope.$broadcast(req.msg, req.data);
    };

    /**
     * Broadcasts a msg that a node was selected (only if selected node is not a folder).
     */
    $scope.nodeClick = function () {
      // broadcast an event when a file is opened
      var lSelectedNode = ProjectFactory.getNode($scope.mytree.currentNode.uniqueId);

      // ignore the click if the selected node is a folder
      if (lSelectedNode !== null && !lSelectedNode.isFolder) {
        var req = IdeMsgService.msgDisplayFileRequest(lSelectedNode.uniqueId);
        $rootScope.$broadcast(req.msg, req.data);
      }
    };

    /**
     * Listen for an event to rename a node. The currently selected node will be renamed.
     */
    $scope.$on(IdeMsgService.msgRenameNodeRequest().msg, function (aEvent) {
      // if the node to rename is the root node, we prevent it
      if ($scope.mytree.currentNode.uniqueId === 0) {
        alert("The root folder can't be renamed.");
      } else {
        // get the file name and file type
        var lNodeId = $scope.mytree.currentNode.uniqueId;
        var lNodeName = ProjectFactory.getNode(lNodeId).filename;
        var lNodeType = ProjectFactory.getNode(lNodeId).isFolder ? 'folder' : 'file';

        var req = IdeMsgService.msgDisplayRenameNodeModalRequest(lNodeId, lNodeName, lNodeType);
        $rootScope.$broadcast(req.msg, req.data);
      }
    });

    /**
     * Listens for the event when the user has provided a new name for the node that should be renamed.
     */
    $scope.$on(IdeMsgService.msgRenameNodeNameAvailable().msg, function (aEvent, aMsgData) {
      ProjectFactory.renameNode(aMsgData.nodeId, aMsgData.nodeName);

      //$scope.projectNodes = ProjectFactory.getProject().files;

      // need to broadcast a ReloadTreeFromProjectFactory msg
      $rootScope.$broadcast(IdeMsgService.msgReloadTreeFromProjectFactory().msg);
    });

    /**
     * Listens for an event to remove a node. The currently selected node will be removed.
     */
    $scope.$on(IdeMsgService.msgRemoveNodeRequest().msg, function (aEvent) {
      // if the node to delete is the root node, we prevent it
      if ($scope.mytree.currentNode.uniqueId === 0) {
        alert("The root folder can't be deleted.");
      } else {
        // get the file name
        var filename = ProjectFactory.getNode($scope.mytree.currentNode.uniqueId).filename;
        var type = ProjectFactory.getNode($scope.mytree.currentNode.uniqueId).isFolder ? 'folder' : 'file';

        var confirmMsg = 'Do you really want to delete ' + type + " '" + filename + "'?";
        var confirmMsg = ProjectFactory.getNode($scope.mytree.currentNode.uniqueId).isFolder
          ? confirmMsg + "\n\nNote: when deleting a folder, make sure it's empty."
          : confirmMsg;

        // ask the user to confirm deletion.
        var _userConfirmed = confirm(confirmMsg);
        if (_userConfirmed) {
          var lSelectedNodeUId = $scope.mytree.currentNode.uniqueId;
          ProjectFactory.removeNode(lSelectedNodeUId, false);

          // Note: we need to select a new node; that's gonna be the root node
          // set the root node to be selected
          ProjectFactory.getNode(0).selected = 'selected';
          // set the root node as the current node
          $scope.mytree.currentNode = ProjectFactory.getNode(0);

          // broadcast a message about which node was removed; e.g. tabs belonging to this node need to be closed
          var req = IdeMsgService.msgRemoveNodeConfirmation(lSelectedNodeUId);
          $rootScope.$broadcast(req.msg, req.data);
        }
      }
    });

    /**
     * Listens for the event when the user has provided a name for the new node that should be added.
     */
    $scope.$on(IdeMsgService.msgNewNodeNameAvailable().msg, function (aEvent, aMsgData) {
      var lSelectedNodeUId = $scope.mytree.currentNode.uniqueId;

      switch (aMsgData.nodeType) {
        case 'file':
          ProjectFactory.addFile(lSelectedNodeUId, aMsgData.nodeName);
          break;
        case 'folder':
          ProjectFactory.addFolder(lSelectedNodeUId, aMsgData.nodeName);
          break;
      }
    });

    /**
     * Listens for the event that the tree should update.
     * Such an update is needed if the ProjectFactory changes the 'files' array (e.g.
     * when loading a user's version of a project) after the 'files' array was already
     * assigned to $scope.projectNodes
     */
    $scope.$on(IdeMsgService.msgReloadTreeFromProjectFactory().msg, function (aEvent) {
      // update the scope to reference the new version of the project
      $scope.projectNodes = ProjectFactory.getProject().files;
    });

    /**
     * Listens for the event that node should be hidden.
     * If received the currently selected node will be hidden or unhidden, depending on its current status.
     */
    $scope.$on(IdeMsgService.msgHideNodeRequest().msg, function () {
      $log.debug('Hide_node request received');

      var lSelectedNodeUId = $scope.mytree.currentNode.uniqueId;

      if (lSelectedNodeUId > 0) {
        $log.debug('Node is hidden: ' + ProjectFactory.getNode(lSelectedNodeUId).isHidden);
        ProjectFactory.setNodeHidden(ProjectFactory.getNode(lSelectedNodeUId));
        $log.debug('Node is hidden: ' + ProjectFactory.getNode(lSelectedNodeUId).isHidden);
      } else {
        console.log("The root folder can't be hidden.");
      }
    });

    /**
     * Listens for the event that node should be uneditable.
     * If received the currently selected node will be uneditable or editable, depending on its current status.
     * @author Janick Michot
     */
    $scope.$on(IdeMsgService.msgMakeNodeStaticNodeRequest().msg, function () {
      $log.debug('Uneditable_node request received');

      var lSelectedNodeUId = $scope.mytree.currentNode.uniqueId;

      if (lSelectedNodeUId > 0) {
        ProjectFactory.setNodeStatic(ProjectFactory.getNode(lSelectedNodeUId));
        $log.debug('Node is hidden: ' + ProjectFactory.getNode(lSelectedNodeUId).isHidden);
      } else {
        console.log("The root folder can't be uneditable.");
      }
    });
  },
]);
