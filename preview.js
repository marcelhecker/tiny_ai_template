/**
 * Automatic preview system for Mustache templates
 */

import express from "express";
import handlebars from "handlebars";
import { engine } from "express-handlebars";
import { resolve } from "path";
import bodyParser from "body-parser";
import config from "./preview-config.json" assert { type: "json" };

import { readdirSync, readFileSync, existsSync } from "fs";

let app = express();

app.set("views", resolve(config.paths.views));
app.set("view engine", "mustache");
app.engine(
  "mustache",
  engine({
    extname: ".mustache",
    partialsDir: resolve(config.paths.partials),
    layoutsDir: resolve("layouts"),
  })
);

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use("/", express.static(resolve(config.paths.public)));

app.use("/", (req, res, next) => {
  if (!req.query.view || !req.query.testcase) {
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

  res.render(req.query.view, JSON.parse(readFileSync(testCaseFilename)));
});

app.get("/", (_req, res) => {
  const views = readdirSync(resolve(config.paths.views))
    .filter((f) => f.endsWith(".mustache") && f != "preview-index.mustache")
    .map((f) => f.substring(0, f.length - 9));

  res.status(200).send(
    handlebars.compile(
      readFileSync(resolve(`preview-index.mustache`)).toString()
    )({
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
    })
  );
});

app.listen(3000, function () {
  console.log("Preview server started");
});
