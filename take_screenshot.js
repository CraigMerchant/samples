const fs = require("fs-extra");
const request = require("request");

const sampleBase = "https://craigmerchant.dev";

function download(uri, filename, callback) {
  request.head(uri, function(err, res, body) {
    request(uri)
      .pipe(fs.createWriteStream(filename))
      .on("close", callback);
  });
}

console.log("taking screenshot");

download(
  "https://scrapshotter.herokuapp.com/?vw=950&vh=850&url=" +
    sampleBase +
    "&output=binary",
  "./site/assets/screenshot.jpg",
  function() {
    console.log("Screenshot captured");
  }
);
