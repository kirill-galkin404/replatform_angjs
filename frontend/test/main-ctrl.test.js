// Pins three defects in the untested AngularJS/jQuery UI (frontend/app.js):
//   (a) $http calls use only the deprecated/absent success-only callback,
//       so a failed request leaves no trace for the user.
//   (c) consequently $scope.error is never populated on a failed request.
//   (b) loadHistory() renders into the DOM via jQuery, entirely outside
//       $scope and Angular's digest, so $scope and the rendered history can
//       disagree.
// All three are written against the FIXED shape of the controller (an
// error surfaced on $scope.error, history fetched into $scope.history via
// $http) and so fail against today's frontend/app.js - they are expected to
// go red now and flip to green once Phase 5 lands.
var test = require('node:test');
var assert = require('node:assert');
var createHarness = require('../testlib/harness').createHarness;

test('a failed initial GET /count surfaces a user-facing error via $scope.error', function () {
  var harness = createHarness();
  harness.withInjector(function ($rootScope, $controller, $httpBackend) {
    $httpBackend.expectGET('http://fake/count').respond(500, { error: 'boom' });
    var scope = $rootScope.$new();
    $controller('MainCtrl', { $scope: scope });
    $httpBackend.flush();
    assert.ok(scope.error, 'expected $scope.error to be set after a failed initial /count fetch, got: ' + scope.error);
  });
});

test('a failed POST /inc surfaces a user-facing error via $scope.error', function () {
  var harness = createHarness();
  harness.withInjector(function ($rootScope, $controller, $httpBackend) {
    $httpBackend.expectGET('http://fake/count').respond(200, { count: 5 });
    var scope = $rootScope.$new();
    $controller('MainCtrl', { $scope: scope });
    $httpBackend.flush();

    $httpBackend.expectPOST('http://fake/inc').respond(500, { error: 'boom' });
    scope.inc();
    $httpBackend.flush();

    assert.ok(scope.error, 'expected $scope.error to be set after a failed /inc, got: ' + scope.error);
  });
});

test('history is fetched into $scope.history via $http, not written to the DOM out-of-band by jQuery', function () {
  var harness = createHarness();
  harness.withInjector(function ($rootScope, $controller, $httpBackend) {
    $httpBackend.expectGET('http://fake/count').respond(200, { count: 0 });
    var scope = $rootScope.$new();
    $controller('MainCtrl', { $scope: scope });
    $httpBackend.flush();

    assert.strictEqual(typeof scope.loadHistory, 'function', 'expected MainCtrl to expose a loadHistory() method on $scope');

    $httpBackend.expectGET('http://fake/history').respond(200, [{ t: 1, op: 'inc', val: 1 }]);
    scope.loadHistory();
    $httpBackend.flush();

    assert.ok(Array.isArray(scope.history), 'expected $scope.history to be an array populated by the fetch');
    assert.strictEqual(scope.history.length, 1);
    assert.strictEqual(scope.history[0].op, 'inc');
  });
});
