// counter backend
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');

var SqliteCounterRepository = require('./src/repositories/sqliteCounterRepository');
var CounterService = require('./src/services/counterService');
var createCounterController = require('./src/controllers/counter.controller');
var createCounterRoutes = require('./src/routes/counter.routes');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// manual CORS because why not
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method == 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

var repository = new SqliteCounterRepository({
  dbFile: path.join(__dirname, 'counter.db'),
  legacyDataFile: path.join(__dirname, 'data.json'),
});
var service = new CounterService(repository);
var controller = createCounterController(service);

app.use('/', createCounterRoutes(controller));

async function main() {
  await service.init();
  console.log('migrations applied');
  app.listen(4000, function () {
    console.log('counter backend running on 4000');
  });
}

main().catch(function (err) {
  console.error('failed to start counter backend', err);
  process.exit(1);
});
