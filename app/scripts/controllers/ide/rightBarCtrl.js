/**
 * Controller for the new right bar
 * @author Janick Michot
 */
app.controller('RightBarCtrl', [
  '$scope',
  '$rootScope',
  'ProjectFactory',
  'IdeMsgService',
  function ($scope, $rootScope, ProjectFactory, IdeMsgService) {
    $scope.navBarRightContent = '';
    $scope.activeTab = '';
    $scope.rightBarTabs = {};
    $scope.showRightBarTabs = true;
    $scope.isCollapsed = true;
    var tablinks = document.getElementsByClassName('tab');

    // In the following all tabs are defined, which are displayed in the right bar. The definition consists of a title,
    // an icon and the ContentUrl. The ContentUrl specifies which template is to be loaded. These templates can in turn
    // be controlled by a controller. With 'disable' you can also define whether the tab should be displayed. This value
    // can be adjusted in a controller via broadcast.

    // tab for project description
    if (ProjectFactory.getProjectDescription() !== '') {
      $scope.rightBarTabs.description = {
        slug: 'description',
        title: 'Aufgabe',
        disabled: false,
        icon: 'glyphicon-education',
        contentURL: 'partials/navBarRight/navBarRightProjectDescription',
      };
    }

    // tab for project description
    if (!$scope.isActionHidden('info')) {
      $scope.rightBarTabs.info = {
        slug: 'info',
        title: 'Info',
        disabled: false,
        icon: 'glyphicon-info-sign',
        contentURL: 'partials/navBarRight/navBarRightInfo',
      };
    }

    // tab for test result
    if (!$scope.isActionHidden('test') && ProjectFactory.hasConfig('Testing', 'ioTests')) {
      $scope.rightBarTabs.test = {
        slug: 'test',
        title: 'Test',
        icon: 'glyphicon-list-alt',
        contentURL: 'partials/navBarRight/navBarRightTest',
      };
    }

    // tab for code explanation (coding-assistant)
    if (!$scope.isActionHidden('explanation')) {
      $scope.rightBarTabs.explanation = {
        slug: 'explanation',
        title: 'Erklärungen',
        disabled: false,
        icon: 'glyphicon-comment',
        contentURL: 'partials/navBarRight/navBarRightExplanation',
      };
    }

    // tab for compiler messages
    if (!$scope.isActionHidden('compiler')) {
      $scope.rightBarTabs.compiler = {
        slug: 'compiler',
        title: 'Compiler',
        disabled: false,
        icon: 'glyphicon-exclamation-sign',
        contentURL: 'partials/navBarRight/navBarRightCompiler',
      };
    }

    // tab for tips
    if (!$scope.isActionHidden('tips')) {
      $scope.rightBarTabs.tips = {
        slug: 'tips',
        title: 'Tipps',
        disabled: false,
        icon: 'glyphicon-gift',
        contentURL: 'partials/navBarRight/navBarRightHints',
      };
    }

    // tab for questions and answers
    if (!$scope.isActionHidden('lecturer-qa') || !$scope.isActionHidden('ai-qa')) {
      $scope.rightBarTabs.questions = {
        slug: 'questions',
        title: 'Fragen',
        disabled: false,
        icon: 'glyphicon-pencil',
        contentURL: 'partials/navBarRight/navBarRightQuestions',
      };
    }

    // tab for code review
    if (!$scope.isActionHidden('codeReview')) {
      // check if the user already has a submission of the project or if the user is not of type `user` (e.g. `owner`)
      const project = ProjectFactory.getProject();
      const tabEnabled = project.projectCompleted || project.userRole !== 'user';

      $scope.rightBarTabs.codeReview = {
        slug: 'codeReview',
        title: 'Code-Review',
        disabled: !tabEnabled,
        icon: 'glyphicon-eye-open',
        contentURL: 'partials/navBarRight/navBarRightCodeReview',
      };
    }

    /**
     * tab for the sample solution
     * sample solution will always be displayed if submission and solution is present in project
     * therefore no isActionHidden check
     */
    if (!$scope.isActionHidden('sampleSolution')) {
      // check if the tab should be enabled or not
      const hasSampleSolution = ProjectFactory.hasSampleSolution();
      const project = ProjectFactory.getProject();
      const tabEnabled = hasSampleSolution && (project.projectCompleted || project.userRole !== 'user');

      $scope.rightBarTabs.sampleSolution = {
        slug: 'sampleSolution',
        title: 'Lösung',
        disabled: !tabEnabled,
        icon: 'glyphicon-screenshot',
        contentURL: 'partials/navBarRight/navBarRightSampleSolution',
      };
    }

    // todo define other tabs

    /**
     * returns true when at least one tab is active
     * @returns {boolean}
     */
    $scope.isNavBarRightActive = function () {
      return !angular.equals({}, $scope.rightBarTabs);
    };

    /**
     * check is tab is active
     * @returns {boolean}
     */
    $scope.isTabActive = function (slug) {
      return $scope.activeTab === slug;
    };

    /**
     * Change content of tab splitter
     * @param slug
     */
    $scope.rightBarTabClick = async function (slug) {
      // indicate an event if the user has reached the request limit
      // this is the case when the user has reached the request limit in a different tab
      // and clicks on a new tab
      if ($scope.isRequestLimitReached()) {
        $rootScope.$broadcast(IdeMsgService.msgRequestLimitReached().msg);
      }

      if (slug === 'explanation') {
        $rootScope.$broadcast(IdeMsgService.msgExpTabClicked().msg);
      }

      if ($scope.activeTab !== slug) {
        $scope.splitter.expand('#ideRighterPartOfMiddlePart');
        $scope.activeTab = slug;

        // remove 'tabClicked' class from all tabs on right side
        for (var i = 0; i < tablinks.length; i++) {
          tablinks[i].classList.remove('tabClicked');
        }

        // add 'tabClicked' class to the clicked tab on the right side
        document.getElementById('rightBarTabs' + $scope.activeTab).classList.add('tabClicked');
      } else {
        $scope.splitter.collapse('#ideRighterPartOfMiddlePart');
        $scope.activeTab = '';
        // remove 'tabClicked' class from all tabs on right side
        for (var i = 0; i < tablinks.length; i++) {
          tablinks[i].classList.remove('tabClicked');
        }
      }
    };

    /**
     * This broadcast can be used to disable tabs from within a tab specific controller
     */
    $scope.$on(IdeMsgService.msgNavBarRightDisableTab().msg, function (event, data) {
      $scope.rightBarTabs[data.slug].disabled = true;
    });

    /**
     * This broadcast can be used to enable tabs from within a tab specific controller
     */
    $scope.$on(IdeMsgService.msgNavBarRightEnableTab().msg, function (event, data) {
      $scope.rightBarTabs[data.slug].disabled = false;
    });

    /**
     * Listens to open tab actions and opens the tab in the right bar.
     */
    $scope.$on(IdeMsgService.msgNavBarRightOpenTab().msg, function (event, data) {
      $scope.splitter.expand('#ideRighterPartOfMiddlePart');
      $scope.activeTab = data.tab;
      for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('tabClicked');
      }
      document.getElementById('rightBarTabs' + $scope.activeTab).classList.add('tabClicked');
    });
  },
]);

app.controller('TabCtrl', [
  '$scope',
  '$rootScope',
  '$log',
  '$uibModal',
  'ProjectFactory',
  'IdeMsgService',
  function ($scope, $rootScope, $log, $uibModal, ProjectFactory, IdeMsgService) {
    $scope.tabs = [];

    /**
     * Function to set a particular tab as active and set all other tabs inactive.
     * @param aArrayIndex the index of the tab to set active
     */
    var makeTabActive = function (aArrayIndex) {
      for (var i = 0; i < $scope.tabs.length; i++) {
        $scope.tabs[i].isActive = i === aArrayIndex;
      }
    };

    /**
     * Function to check if a tab already exists for a specific node.
     * @param {number} aNodeId the uniqueId of the node
     * @return {number} returns -1 if no tab exists yet, otherwise the array index of the tab
     */
    var doesTabAlreadyExist = function (aNodeId) {
      for (var i = 0; i < $scope.tabs.length; i++) {
        if ($scope.tabs[i].nodeIndex === aNodeId) {
          return i;
        }
      }
      return -1;
    };

    /**
     * Function that is called when a tab is clicked on by the user.
     * @param {number} aArrayIndex the array index (it's a property of a tab) of the tab that was clicked on
     */
    $scope.selectClick = function (aArrayIndex) {
      var req = IdeMsgService.msgDisplayFileRequest($scope.tabs[aArrayIndex].nodeIndex);
      $rootScope.$broadcast(req.msg, req.data);
    };

    /**
     * Removes a tab from the array
     * @param aArrayIndex the array index at which position the tab is stored
     */
    $scope.closeClick = function (aArrayIndex) {
      $log.debug('Close-tab clicked; array-index:' + aArrayIndex);

      // all tabs are to the right of the tab to-be-deleted need to update their arrayIndex position
      for (var i = aArrayIndex + 1; i < $scope.tabs.length; i++) {
        $scope.tabs[i].arrayIndex = $scope.tabs[i].arrayIndex - 1;
      }

      // if the tab to be closed was active, pick a neighboring tab be active
      if ($scope.tabs[aArrayIndex].isActive) {
        // need to handle different cases:
        if ($scope.tabs.length === 1) {
          // the tab to-be-removed is the only tab; after closing there are not tabs open
          // signal that the editor should be hidden
          var req = IdeMsgService.msgDisplayEditorRequest(false);
          $rootScope.$broadcast(req.msg, req.data);
        } else if (aArrayIndex === 0) {
          // other tabs exist and the tab to-be-removed is the left-most; so we activate this neighbor to the right
          var req = IdeMsgService.msgDisplayFileRequest($scope.tabs[aArrayIndex + 1].nodeIndex);
          $rootScope.$broadcast(req.msg, req.data);
        } else {
          // other tabs exist and the tab to-be-removed has neighboring tabs to the left; we select the left neighbor
          var req = IdeMsgService.msgDisplayFileRequest($scope.tabs[aArrayIndex - 1].nodeIndex);
          $rootScope.$broadcast(req.msg, req.data);
        }
      }

      // remove the tab
      $scope.tabs.splice(aArrayIndex, 1);
    };

    $scope.$on(IdeMsgService.msgDisplayFileRequest().msg, function (aEvent, aMsgData) {
      // if no tab is displayed yet, send a message that the editor shall be displayed
      if ($scope.tabs.length === 0) {
        var req = IdeMsgService.msgDisplayEditorRequest(true);
        $rootScope.$broadcast(req.msg, req.data);
      }

      // check if the requested file already has an opened tab
      var k = doesTabAlreadyExist(aMsgData.nodeId);

      if (k === -1) {
        // there's no tab for the request file yet, so we create one

        // get the node for which a tab should be added
        var lRequestedNode = ProjectFactory.getNode(aMsgData.nodeId);

        // push a new tab to the list of tabs
        $scope.tabs.push({
          name: lRequestedNode.filename,
          title: lRequestedNode.path + '/' + lRequestedNode.filename,
          nodeIndex: aMsgData.nodeId,
          arrayIndex: $scope.tabs.length,
          isActive: false,
          isStatic: lRequestedNode.isStatic && !$scope.currentRoleIsOwner() ? true : false,
        });

        //make the new tab active (this call will also make the previous active tab inactive)
        makeTabActive($scope.tabs.length - 1);
      } else {
        // there's already a tab opened for the request file
        // so we simply activate that tab
        makeTabActive(k);
      }
    });

    /**
     * Listens for the event when the user has provided a new name for the node that should be renamed.
     * This event handler then changes the name of the open tab (if one exists).
     */
    $scope.$on(IdeMsgService.msgRenameNodeNameAvailable().msg, function (aEvent, aMsgData) {
      // if a tab for the node-to-be-renamed is open, get its id
      var tabId = doesTabAlreadyExist(aMsgData.nodeId);

      if (tabId !== -1) {
        $scope.tabs[tabId].name = aMsgData.nodeName;
      }
    });

    /**
     * Listen for a confirmation that a node was removed. If a tab for that node is open
     * we need to close it.
     * TODO: if remove is a folder, close all children
     */
    $scope.$on(IdeMsgService.msgRemoveNodeConfirmation().msg, function (aEvent, aMsgData) {
      // if a tab for the node-to-be-removed is open, get its id
      var tabId = doesTabAlreadyExist(aMsgData.uniqueId);

      if (tabId !== -1) {
        $scope.closeClick(tabId);
      }
    });

    /** Handles the event that the Modal for "Share Project" should show be shown. */
    $scope.$on(IdeMsgService.msgShowShareProjectModalRequest().msg, function (aEvent, aMsgData) {
      // need a reference to the tabs which is accessible inside the modal; $scope.tabs won't work because the modal has it's own scope.
      var tabs = $scope.tabs;

      /** The controller for the modal */
      var shareProjectModalInstanceCtrl = [
        '$scope',
        '$location',
        '$uibModalInstance',
        function ($scope, $location, $uibModalInstance) {
          /** Function returns the full Url but with all query strings removed, i.e. after the '?' */
          var getAbsUrlWithoutQueryString = function getAbsUrlWithoutQueryString() {
            var result = $location.absUrl();
            var queryStartIndex = result.indexOf('?');

            if (queryStartIndex >= 0) {
              result = result.substr(0, queryStartIndex);
            }

            return result;
          };

          // data-binding for the from that shows the Share-Url and a checkbox
          // Note: we use getAbsUrlWithoutQueryString because the user might have open e.g. /projects/11?view=2.1
          // Now if were to simply use $location.absUrl, then we would append another ?view=x.x onto the existing one, giving us /project/11?view=2.1?view=x.x
          // To avoid this, we get the Url without the query string.
          $scope.form = {
            inputText: getAbsUrlWithoutQueryString(),
            inputCheckbox: false,
          };

          /** Append or remove the "?view=..." query string */
          $scope.checkboxChanged = function () {
            // we always show the default, absolute Url
            $scope.form.inputText = getAbsUrlWithoutQueryString();

            // append the view query string if the checkbox is selected
            if ($scope.form.inputCheckbox) {
              // by default the view query string is empty
              var viewQueryString = '';

              // if tabs are open, we append to the veiw query string
              if (tabs.length > 0) {
                // the key of the query string
                viewQueryString += '?view=';
                // calculates the values of the query string
                for (var i = 0; i < tabs.length; i++) {
                  // get the nodeId and if the node is active or not
                  viewQueryString += tabs[i].nodeIndex + '.' + (tabs[i].isActive ? '1' : '0');

                  // add the separator "-", as in 2.1-3.0-4.0 (except after the last tab)
                  viewQueryString += i < tabs.length - 1 ? '-' : '';
                }
              }

              // append the calculated view query string
              $scope.form.inputText += viewQueryString;
            }
          };

          $scope.closeModal = function () {
            $uibModalInstance.close();
          };
        },
      ];

      // call the function to open the modal (we ignore the modalInstance returned by this call as we don't need to access any data from the modal)
      $uibModal.open({
        templateUrl: 'ideShareProjectModal.html',
        controller: shareProjectModalInstanceCtrl,
      });
    });
  },
]);
