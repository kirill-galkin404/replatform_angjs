// counter backend - wiring + bootstrap.
//
// This is the plan's "app.ts" role (Express app construction, middleware
// wiring, and the require.main===module PORT/0.0.0.0 bootstrap). It is
// named server.ts, not app.ts, so that compiling in place (rootDir=outDir=
// backend/) produces backend/server.js directly - the exact require()
// target backend/test/*.js already uses - with no extra re-export shim.
import express from 'express';
import bodyParser from 'body-parser';
import { cors, notFound, errorHandler } from './middleware';
import routes from './routes';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors);

app.use(routes);

// 404 handler - unmatched routes get a structured JSON body
app.use(notFound);

// centralised error-handling middleware - must be last
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(Number(PORT), '0.0.0.0', function () {
    console.log('counter backend running on ' + PORT);
  });
}

module.exports = app;
