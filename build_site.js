const fs = require("fs-extra");
const pug = require("pug");
const md = require("markdown-it")();
const request = require("request");

const baseFolder = "./samples/";
const sourceBase =
  "https://github.com/CraigMerchant/samples/tree/main/samples/";
const sampleBase = "https://craigmerchant.dev";

function getDirectories(source) {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !dirent.name.includes(".") &&
        !dirent.name.startsWith("_")
    )
    .map((dirent) => dirent.name);
}

async function buildSite() {
  try {
    await fs.ensureDir("build");
  } catch (err) {
    console.error(err);
  }

  fs.copySync("./samples", "./build/samples");

  var posts = [];
  var readme = "# CraigMerchant - Sample projects\n\n";
  readme += "https://craigmerchant.dev\n\n";

  getDirectories(baseFolder).forEach((file) => {
    var postFilename = baseFolder + file + "/README.md";
    var url = "/samples/" + file + "/";
    var fullSampleURL = sampleBase + url;
    var sourceUrl = sourceBase + file;
    var post = {
      url,
      created: "",
      title: "",
      body: "",
      source: sourceUrl,
      fullSampleURL,
    };

    if (fs.existsSync(postFilename)) {
      const body = fs.readFileSync(postFilename, "utf8").trim();
      const parts = body.split("---");
      var metadata = {};

      if (parts.length === 3) {
        var metaDataBody = parts[1].trim();
        var metaParts = metaDataBody.split("\n");

        metaParts.forEach((meta) => {
          var parts = meta.split(": ");

          post[parts[0]] = parts[1];
        });
      }

      const html = md.render(parts[2]);
      post.body = html;
    }

    posts.push(post);
  });

  fs.writeFileSync("./README.md", readme);

  // Sort the posts by date
  posts.sort((a, b) => b.created.localeCompare(a.created));

  // Write readme file
  var i;
  for (i = 0; i < posts.length; i++) {
    const post = posts[i];

    // Add to readme
    readme += `### ${post.title}\n[Source](${post.source}) - [Demo](${post.fullSampleURL})\n\n`;
  }

  var html = pug.renderFile("./site/template.pug", {
    pageTitle: "CraigMerchant.dev",
    posts,
  });

  fs.writeFileSync("./build/index.html", html);

  fs.copySync("./site/_headers", "./build/_headers");

  fs.copySync("./site/assets", "./build/assets");

  console.log("found " + posts.length + " posts");
}

buildSite();
