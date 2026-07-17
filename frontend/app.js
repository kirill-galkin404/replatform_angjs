// counter app
var API = window.API_BASE_URL || 'http://localhost:4000';

var app = angular.module('counterApp', []);

app.controller('MainCtrl', function ($scope, $http) {

  $scope.count = 0;
  $scope.step = 1;

  // grab initial count
  $http.get(API + '/count').success(function (data) {
    $scope.count = data.count;
  });

  $scope.inc = function () {
    $http.post(API + '/inc', { by: $scope.step }).success(function (data) {
      $scope.count = data.count;
    });
  };

  $scope.dec = function () {
    $http.post(API + '/dec', {}).success(function (data) {
      $scope.count = data.count;
    });
  };

  $scope.reset = function () {
    if (confirm('sure?')) {
      $http.post(API + '/reset', {}).success(function (data) {
        $scope.count = data.count;
      });
    }
  };

});

// history rendered with jQuery outside angular, whatever works
function loadHistory() {
  $.get(API + '/history', function (data) {
    var html = '<b>History:</b><ul>';
    for (var i = 0; i < data.length; i++) {
      var d = new Date(data[i].t);
      html = html + '<li>' + d.toLocaleTimeString() + ' - ' + data[i].op + ' -> ' + data[i].val + '</li>';
    }
    html = html + '</ul>';
    document.getElementById('hist').innerHTML = html;
  });
}
