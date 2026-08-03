// counter app
var API = window.API_BASE_URL || 'http://localhost:4000';

var app = angular.module('counterApp', []);

app.controller('MainCtrl', function ($scope, $http) {

  $scope.count = 0;
  $scope.step = 1;
  $scope.history = [];

  $scope.loadHistory = function () {
    $http.get(API + '/history').then(function (res) {
      $scope.history = res.data;
    });
  };

  // grab initial count
  $http.get(API + '/count').then(function (res) {
    $scope.count = res.data.count;
  });

  $scope.inc = function () {
    $http.post(API + '/inc', { by: $scope.step }).then(function (res) {
      $scope.count = res.data.count;
      $scope.loadHistory();
    });
  };

  $scope.dec = function () {
    $http.post(API + '/dec', {}).then(function (res) {
      $scope.count = res.data.count;
      $scope.loadHistory();
    });
  };

  $scope.reset = function () {
    if (confirm('sure?')) {
      $http.post(API + '/reset', {}).then(function (res) {
        $scope.count = res.data.count;
        $scope.loadHistory();
      });
    }
  };

});
