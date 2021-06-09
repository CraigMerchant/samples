const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Load extension to close cookie content messages
const basePath = process.cwd();
const cookieIgnorePath = `${basePath}/extensions/cookieconsent`;

app.use(cors());
app.set("port", process.env.PORT || 3000);

app.get("/", async function(req, res, next) {
  try {
    const { vw, vh, w, h, resize, ...query } = req.query;

    const o = {
      url: null,
      vw: vw ? parseInt(vw) : 800,
      vh: vh ? parseInt(vh) : 600,
      ...query,
    };

    // Return empty jpeg if no url specified
    if (!o.url) {
      res.type("jpeg");
      res.end();
      return next();
    }

    const browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--disable-extensions-except=${cookieIgnorePath}`,
        `--load-extension=${cookieIgnorePath}`,
      ],
    });
    
    const page = await browser.newPage();

    await page.setViewport({
      width: o.vw,
      height: o.vh,
    });

    // Get url
    await page.goto(o.url);

    // Wait for any messages/models to appear
    await sleep(1000);

    // Press enter to close any modal/messages
    await page.keyboard.press(String.fromCharCode(13));

    // Take screenshot
    let binary = await page.screenshot({
      type: "jpeg",
    });

    // Tidy up
    await browser.close();

    // Output screenshot
    res.type("jpeg");
    res.end(binary);

    next();
  } catch (error) {
    next(error);
  }
});

app.listen(app.get("port"), function() {
  console.log("running at localhost:" + app.get("port"));
});