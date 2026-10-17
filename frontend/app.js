// counter app
var API = window.API_BASE_URL || 'http://localhost:4000';

var app = angular.module('counterApp', []);

app.controller('MainCtrl', function ($scope, $http) {

  $scope.count = 0;
  $scope.step = 1;
  $scope.error = null;
  $scope.history = [];

  function describeError(res) {
    if (res && res.data && res.data.error) {
      return res.data.error;
    }
    return 'Request failed, please try again.';
  }

  // grab initial count
  $http.get(API + '/count').then(function (res) {
    $scope.count = res.data.count;
  }).catch(function (res) {
    $scope.error = describeError(res);
  });

  $scope.inc = function () {
    $http.post(API + '/inc', { by: $scope.step }).then(function (res) {
      $scope.count = res.data.count;
      $scope.error = null;
    }).catch(function (res) {
      $scope.error = describeError(res);
    });
  };

  $scope.dec = function () {
    $http.post(API + '/dec', {}).then(function (res) {
      $scope.count = res.data.count;
      $scope.error = null;
    }).catch(function (res) {
      $scope.error = describeError(res);
    });
  };

  $scope.reset = function () {
    if (confirm('sure?')) {
      $http.post(API + '/reset', {}).then(function (res) {
        $scope.count = res.data.count;
        $scope.error = null;
      }).catch(function (res) {
        $scope.error = describeError(res);
      });
    }
  };

  // History is now fetched into $scope.history and rendered via ng-repeat,
  // so it stays in sync with Angular's digest cycle instead of being
  // written directly into the DOM by an out-of-band jQuery call.
  $scope.loadHistory = function () {
    $http.get(API + '/history').then(function (res) {
      $scope.history = res.data;
      $scope.error = null;
    }).catch(function (res) {
      $scope.error = describeError(res);
    });
  };

});
