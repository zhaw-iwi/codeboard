/**
 * Controller for the footer status bar of the IDE.
 */
app.controller('IdeFooterStatusBarCtrl', [
  '$scope',
  '$routeParams',
  'UserSrv',
  'ProjectFactory',
  function ($scope, $routeParams, UserSrv, ProjectFactory) {
    /* Returns the username of the current user or '#anonymous' if user is not logged in */
    $scope.getUsername = function () {
      var _msg = 'User: ';

      if (UserSrv.isAuthenticated()) {
        _msg += UserSrv.getUsername();
      } else {
        _msg +=
          '#anonymous (<a href="' +
          $scope.signinSettings.signinPathWithRedirect() +
          '">sign in</a> to save your progress)';
      }

      return _msg;
    };

    /* Returns a string that details the current user's role */
    $scope.getCourse = function () {
      return ProjectFactory.getProject().courseData ? ProjectFactory.getProject().courseData.coursename : '';
    };

    /* Returns a string that details the current user's role */
    $scope.getRole = function () {
      if ($scope.currentRoleIsLtiUser()) {
        return 'LTI User';
      } else if ($scope.currentRoleIsOwner()) {
        return 'Project owner';
      } else if ($scope.currentRoleIsUser()) {
        return 'Project user';
      } else if ($scope.currentRoleIsSubmission()) {
        var _submissionRole = 'Inspection of a submission';

        // we check we now the name of the user we're inspecting; if yes, we use the name as part of the role description
        if (ProjectFactory.getProject().userBeingInspected) {
          _submissionRole = 'Inspecting submission from user "' + ProjectFactory.getProject().userBeingInspected + '"';
        }
        return _submissionRole;
      } else if ($scope.currentRoleIsUserProject()) {
        var _userProjectRole = "Inspection of a user's project";

        // we check if the url has parameter ?username=xxx; if yes, we use the name as part of the role description
        if (ProjectFactory.getProject().userBeingInspected) {
          _userProjectRole =
            'Inspecting user-project from user "' + ProjectFactory.getProject().userBeingInspected + '"';
        }
        return _userProjectRole;
      } else if ($scope.currentRoleIsHelp()) {
        var _helpRequestRole = 'Inspection of a helprequest';

        // we check we now the name of the user we're inspecting; if yes, we use the name as part of the role description
        if (ProjectFactory.getProject().userBeingInspected) {
          _helpRequestRole =
            'Inspecting helpRequest from user "' + ProjectFactory.getProject().userBeingInspected + '"';
        }
        return _helpRequestRole;
      }
    };

    /** Returns 'true' is the project is using Lti for the submission */
    $scope.isUsingLti = function () {
      return ProjectFactory.getProject().hasLtiData;
    };

    $scope.hasCourse = function () {
      let courseData = ProjectFactory.getProject().courseData;
      if (Object.keys(courseData).length === 0 && !$scope.currentRoleIsOwner()) {
        $scope.disabledActions.submit = true;
      }
      return typeof courseData !== 'undefined';
    };
  },
]);
