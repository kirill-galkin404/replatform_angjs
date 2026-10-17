// Minimal AngularJS 1.2 test harness: AngularJS ships its own testing
// helpers (ngMock: $httpBackend, module(), inject()) but they only attach
// themselves to `window.module`/`window.inject` when `window.jasmine` or
// `window.mocha` is truthy (see angular-mocks.js), and they drive a single
// "current spec" object via Jasmine/Mocha's beforeEach/afterEach globals.
// There is no Jasmine/Mocha here (this project uses node:test), so this
// harness fakes the minimum surface ngMock needs: a truthy window.mocha
// sentinel and beforeEach/afterEach shims that immediately invoke their
// callback against a reusable "spec" bag - enough for angular-mocks to hand
// us working module()/inject() functions under jsdom, headless, with no
// browser or real network involved.
var fs = require('fs');
var path = require('path');
var { JSDOM } = require('jsdom');

var ANGULAR_JS = fs.readFileSync(require.resolve('angular/angular.js'), 'utf8');
var ANGULAR_MOCKS_JS = fs.readFileSync(require.resolve('angular-mocks/angular-mocks.js'), 'utf8');
var APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Creates a fresh jsdom window with Angular + ngMock + the real app.js
// loaded into it. Fresh per test so controller/module registration in one
// test can't leak into another.
function createHarness() {
  var dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost/'
  });
  var window = dom.window;

  var spec = {};
  window.mocha = true;
  window.beforeEach = function (fn) { fn.call(spec); };
  window.afterEach = function (fn) { spec.__afterEach = fn; };

  window.eval(ANGULAR_JS);
  window.eval(ANGULAR_MOCKS_JS);
  window.API_BASE_URL = 'http://fake';
  window.eval(APP_JS);

  function resetSpec() {
    spec.$injector = null;
    spec.$modules = null;
  }

  // Runs `fn` with a fresh injector for the 'counterApp' module, giving it
  // $rootScope/$controller/$httpBackend (ngMock's HTTP fake) as arguments,
  // the same way a real *.spec.js would via inject(function($rootScope, ...) {...}).
  function withInjector(fn) {
    resetSpec();
    window.module('counterApp');
    return window.inject(fn);
  }

  return { window: window, withInjector: withInjector };
}

module.exports = { createHarness: createHarness };
