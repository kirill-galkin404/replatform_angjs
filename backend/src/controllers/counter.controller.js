'use strict';

// req/res only - all business logic lives in CounterService.
function createCounterController(service) {
  return {
    getCount: async function (req, res) {
      var count = await service.getCount();
      res.send({ count: count });
    },

    increment: async function (req, res) {
      var count = await service.increment(req.body.by);
      res.send({ count: count });
    },

    decrement: async function (req, res) {
      var count = await service.decrement();
      res.send({ count: count });
    },

    reset: async function (req, res) {
      var count = await service.reset();
      res.send({ count: count });
    },

    getHistory: async function (req, res) {
      var history = await service.getHistory();
      res.send(history);
    },
  };
}

module.exports = createCounterController;
