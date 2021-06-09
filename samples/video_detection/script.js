const app = document.getElementById("app");
const canvas = document.getElementById("canvas");
const canvas2 = document.getElementById("canvas2");
const video = document.getElementById("video");
const ctx = canvas.getContext("2d");
const ctx2 = canvas2.getContext("2d");

let modelPromise;
let model;
let predictions;
let loadedModel = false;

window.onload = async () => {

  modelPromise = cocoSsd.load({ base: "mobilenet_v2" });
  model = await modelPromise;

  document.getElementById("processedVideo").style.display = "block";
  document.getElementById("loading").style.display = "none";

  requestAnimationFrame(updateCanvas);
};

function drawObjectBoxes() {
  predictions.map((prediction) => {
    const {
      distanceBreach,
      bbox: [x, y, width, height],
    } = prediction;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(0, 250, 0)";
    ctx.fillStyle = "rgb(0, 250, 0)";
    ctx.strokeRect(x, y, width, height);
    ctx.font = "9px Arial";
    ctx.fillText(prediction.class, x, y - 2);
  });
}

function extractObjects() {
  ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

  var xOffset = 0;

  predictions.map((prediction) => {
    const {
      bbox: [x, y, width, height],
    } = prediction;

    const { width: newWidth, height: newHeight } = resizePerson(
      width,
      height,
      150
    );

    ctx2.drawImage(
      canvas,
      x,
      y,
      width,
      height,
      xOffset,
      0,
      newWidth,
      newHeight
    );

    ctx2.fillText(prediction.class, xOffset, newHeight + 10);

    xOffset = xOffset + newWidth + 10;
  });
}

function resizePerson(width, height, maxHeight) {
  const ratio = width / height;

  return { width: Math.round(ratio * maxHeight), height: maxHeight };
}

const updateCanvas = async () => {
  const { ended, paused, width, height } = video;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (model != undefined) {
    ctx.drawImage(video, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    predictions = await model.detect(imageData);

    if (predictions.length > 0) {
      extractObjects();
      drawObjectBoxes();
    }
  }

  requestAnimationFrame(updateCanvas);
};
