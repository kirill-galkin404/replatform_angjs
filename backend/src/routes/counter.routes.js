'use strict';

var express = require('express');

// Maps the 5 existing verbs to controller methods. Paths and HTTP methods
// are byte-identical to the original single-file server.
function createCounterRoutes(controller) {
  var router = express.Router();

  router.get('/count', controller.getCount);
  router.post('/inc', controller.increment);
  router.post('/dec', controller.decrement);
  router.post('/reset', controller.reset);
  router.get('/history', controller.getHistory);

  return router;
}

module.exports = createCounterRoutes;
