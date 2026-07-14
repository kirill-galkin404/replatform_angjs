// counter backend - do not touch, it works
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// global state, whatever
var DB_FILE = './data.json';
var count = 0;
var history = [];

// load on boot
try {
  var raw = fs.readFileSync(DB_FILE, 'utf8');
  var obj = JSON.parse(raw);
  count = obj.count;
  history = obj.history;
} catch (e) {
  count = 0;
  history = [];
}

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

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify({ count: count, history: history }));
}

app.get('/count', function (req, res) {
  res.send({ count: count });
});

app.post('/inc', function (req, res) {
  var by = req.body.by;
  if (by == undefined) {
    by = 1;
  }
  count = count + parseInt(by);
  history.push({ t: new Date().getTime(), op: 'inc', val: count });
  save();
  res.send({ count: count });
});

app.post('/dec', function (req, res) {
  count = count - 1;
  history.push({ t: new Date().getTime(), op: 'dec', val: count });
  save();
  res.send({ count: count });
});

app.post('/reset', function (req, res) {
  count = 0;
  history.push({ t: new Date().getTime(), op: 'reset', val: 0 });
  save();
  res.send({ count: count });
});

app.get('/history', function (req, res) {
  res.send(history);
});

app.listen(4000, function () {
  console.log('counter backend running on 4000');
});
