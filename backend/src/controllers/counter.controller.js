'use strict';

// Express 4 does not catch rejections thrown by async route handlers - an
// uncaught rejection here would otherwise crash the whole process on a
// single bad request. Every handler below is wrapped so a failure results
// in an HTTP error response instead of taking the server down.
function asyncHandler(fn) {
  return function (req, res) {
    Promise.resolve(fn(req, res)).catch(function (err) {
      console.error(err);
      var status = (err && err.status) || 500;
      res.status(status).send({ error: (err && err.message) || 'internal error' });
    });
  };
}

// req/res only - all business logic lives in CounterService.
function createCounterController(service) {
  return {
    getCount: asyncHandler(async function (req, res) {
      var count = await service.getCount();
      res.send({ count: count });
    }),

    increment: asyncHandler(async function (req, res) {
      var count = await service.increment(req.body.by);
      res.send({ count: count });
    }),

    decrement: asyncHandler(async function (req, res) {
      var count = await service.decrement();
      res.send({ count: count });
    }),

    reset: asyncHandler(async function (req, res) {
      var count = await service.reset();
      res.send({ count: count });
    }),

    getHistory: asyncHandler(async function (req, res) {
      var history = await service.getHistory();
      res.send(history);
    }),
  };
}

module.exports = createCounterController;
