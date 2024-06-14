#!/usr/bin/env node

/**
 * Automatic preview system for Mustache templates
 */

import express from "express";
import handlebars from "handlebars";
import { create } from "express-handlebars";
import { resolve } from "path";
import bodyParser from "body-parser";
import {
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { program } from "commander";
import ExpressWs from "express-ws";
import chokidar from "chokidar";

program.option("-c, --config <config>").option("-p, --port <port>");
program.parse();
const cliOptions = program.opts();
const config = (
  await import(
    cliOptions.config
      ? resolve(cliOptions.config)
      : resolve("./preview.config.mjs")
  )
).default;

if (!config) {
  console.error("No configuration file at ./preview.config.js");
  exit(1);
}

let app = express();
const expressWs = ExpressWs(app);

app.set("views", resolve(config.paths.views));
app.set("view engine", "mustache");
const hdlbrs = create({
  extname: ".mustache",
  partialsDir: config.paths.partials,
  layoutsDir: config.paths.layouts ? resolve(config.paths.layouts) : undefined,
  helpers: config.helpers,
});
app.engine("mustache", hdlbrs.engine);

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use("/", express.static(resolve(config.paths.public)));

app.use("/", (req, res, next) => {
  if (!req.query.view || !req.query.testcase || !req.query.layout) {
    return next();
  }

  const testCaseFilename = resolve(
    `${config.paths["test-data"]}/${req.query.view}/${req.query.testcase}.json`
  );

  if (
    !existsSync(resolve(`${config.paths.views}/${req.query.view}.mustache`))
  ) {
    return res.status(404).send(`unknown view ${req.query.view}`);
  }
  if (!existsSync(testCaseFilename)) {
    return res.status(404).send(`unknown test case ${req.query.testcase}`);
  }

  res.render(req.query.view, {
    ...JSON.parse(readFileSync(testCaseFilename)),
    layout: config.paths.layouts ? req.query.layout : undefined,
  });
});

app.use("/", async (req, res, next) => {
  if (!req.query.partial || !req.query.testcase || !req.query.layout) {
    return next();
  }

  const testCaseFilename = resolve(
    `${config.paths["test-data"]}/${req.query.partial}/${req.query.testcase}.json`
  );

  if (!(await hdlbrs.getPartials())[req.query.partial]) {
    return res.status(404).send(`unknown partial ${req.query.partial}`);
  }
  if (!existsSync(testCaseFilename)) {
    return res.status(404).send(`unknown test case ${req.query.testcase}`);
  }

  writeFileSync(
    resolve(`${config.paths.views}/tmp.mustache`),
    `{{>${req.query.partial}}}`
  );

  res.render(
    "tmp",
    {
      ...JSON.parse(readFileSync(testCaseFilename)),
      layout: config.paths.layouts ? req.query.layout : undefined,
    },
    (err, html) => {
      unlinkSync(`${config.paths.views}/tmp.mustache`);
      res.send(html);
    }
  );
});

app.get("/", async (_req, res) => {
  const views = readdirSync(resolve(config.paths.views))
    .filter((f) => f.endsWith(".mustache"))
    .map((f) => f.substring(0, f.length - 9));

  let layouts = ["preview"];
  if (config.paths.layouts) {
    layouts = readdirSync(resolve(config.paths.layouts))
      .filter((f) => f.endsWith(".mustache"))
      .map((f) => f.substring(0, f.length - 9));
  }

  const partialNames = Object.keys(await hdlbrs.getPartials());
  const partials = partialNames
    .map((p) => {
      let testCases = [];
      try {
        testCases = readdirSync(resolve(`${config.paths["test-data"]}/${p}`))
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.substring(0, f.length - 5));
      } catch {
        // maybe there are no test cases, so we silently ignore errors
      }
      return {
        name: p,
        testCases,
      };
    })
    .filter((p) => p.testCases.length > 0);

  res.status(200).send(
    handlebars.compile(
      readFileSync(
        resolve(`${import.meta.dirname}/preview-index.mustache`)
      ).toString()
    )({
      layouts,
      views: views.map((view) => {
        let testCases = [];
        try {
          testCases = readdirSync(
            resolve(`${config.paths["test-data"]}/${view}`)
          )
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.substring(0, f.length - 5));
        } catch {
          // maybe there are no test cases, so we silently ignore errors
        }
        return {
          name: view,
          testCases,
        };
      }),
      partials,
    })
  );
});

const getWatchDirs = () => {
  const dirs = [
    resolve(config.paths.views),
    resolve(config.paths.public),
    resolve(config.paths["test-data"]),
    ...(typeof config.paths.partials === "string"
      ? [resolve(config.paths.partials)]
      : config.paths.partials.map((p) => resolve(p.dir))),
  ];
  if (config.paths.layouts) {
    dirs.push(resolve(config.paths.layouts));
  }
  return dirs;
};

app.ws("/", (ws) => {
  const watcher = chokidar.watch(getWatchDirs(), {
    ignored: resolve(`${config.paths.views}/tmp.mustache`),
  });
  watcher.on("all", () => {
    ws.send("refresh");
  });
  ws.on("close", () => {
    watcher.close();
  });
});

const port = cliOptions.port ? Number.parseInt(cliOptions.port) : 3000;

app.listen(port, function () {
  console.log(`Preview server started at http://localhost:${port}`);
});
