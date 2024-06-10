/**
 * Automatic preview system for Mustache templates
 */

import express from "express";
import mustacheExpress from "mustache-express";
import mustache from "mustache";
import { resolve } from "path";
import bodyParser from "body-parser";
import { readdirSync, readFileSync, existsSync } from "fs";

let app = express();

app.set("views", resolve(`views`));
app.set("view engine", "mustache");
app.engine("mustache", mustacheExpress(resolve("views/partials")));

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  const views = readdirSync(resolve(`views`))
    .filter((f) => f.endsWith(".mustache") && f != "index.mustache")
    .map((f) => f.substring(0, f.length - 9));

  res.status(200).send(
    mustache.render(readFileSync(resolve(`index.mustache`)).toString(), {
      views: views.map((view) => {
        let testCases = [];
        try {
          testCases = readdirSync(resolve(`test-data/${view}`))
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

// Serve static files
app.use("/", express.static(resolve(`public`)));

app.use("/:view/:testcase", (req, res) => {
  const testCaseFilename = resolve(
    `test-data/${req.params.view}/${req.params.testcase}.json`
  );

  if (!existsSync(resolve(`views/${req.params.view}.mustache`))) {
    return res.status(404).send(`unknown view ${req.params.view}`);
  }
  if (!existsSync(testCaseFilename)) {
    return res.status(404).send(`unknown test case ${req.params.testcase}`);
  }

  res.render(req.params.view, JSON.parse(readFileSync(testCaseFilename)));
});

app.listen(3000, function () {
  console.log("Preview server started");
});
