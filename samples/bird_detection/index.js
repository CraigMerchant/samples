const allowed_image_mimetypes = [
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const threshold = 0.2;

var model;
var imgCount = 0;
var labels = {};
var loadedModel = false;
var queue = [];

async function loaded() {
  getLabels();

  let dropArea = document.getElementById("drop-area");

  dropArea.addEventListener("drop", handleDrop, false);

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  model = await tf.loadGraphModel("model/model.json");

  loadedModel = true;

  processQueue();
}

function getLabels() {
  fetch("labels.json")
    .then((response) => response.json())
    .then((data) => {
      labels = data;
    });
}

function imageToTensor(img) {
  const offset = tf.scalar(127.5);

  let tensor = tf.browser
    .fromPixels(img)
    .resizeBilinear([224, 224])
    .toFloat()
    .sub(offset)
    .div(offset)
    .expandDims();

  return tensor;
}

function handleDrop(e) {
  var dt = e.dataTransfer;
  var files = dt.files;

  handleFiles(files);
}

function handleFiles(files) {
  files = [...files];
  files.forEach(previewFile);
}

function previewFile(file) {
  if (!model) {
    console.error("model not loaded yet");
    return;
  }

  if (!file || !allowed_image_mimetypes.includes(file.type)) {
    console.error("invalid image file");
    return;
  }

  var id = imgCount;

  let reader = new FileReader();
  reader.onloadend = function() {
    createGalleryImage(reader.result, id);
  };
  reader.readAsDataURL(file);

  imgCount++;
}

function createGalleryImage(data, id) {
  let div = document.createElement("div");
  div.className = "result";
  div.id = id;

  let img = document.createElement("img");
  img.id = id + "img";
  img.src = data;
  img.crossOrigin = "anonymous";
  img.onload = () => {
    setTimeout(function() {
      detect(id);
    }, 1000);
  };
  div.appendChild(img);

  let loader = document.createElement("div");
  loader.id = id + "loader";
  loader.className = "loader";
  loader.innerHTML =
    '<div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
  div.appendChild(loader);

  let p = document.createElement("p");
  p.id = id + "text";
  p.innerText = "Loading";
  div.appendChild(p);

  document.getElementById("gallery").prepend(div);
  document.getElementById("results").style.display = "block";
}

function processQueue() {
  queue.forEach((id) => {
    detect(id);
  });

  queue = [];
}

async function detect(id) {
  if (!loadedModel) {
    queue.push(id);
    return;
  }

  const img = document.getElementById(id + "img");

  const tensor = imageToTensor(img);

  const logits = await model.predict(tensor).dataSync();

  var text = "Unknown";

  let top3 = Array.from(logits)
    .map(function(p, i) {
      const label = labels[i] || "Unknown";

      return {
        probability: p,
        label: label,
      };
    })
    .sort(function(a, b) {
      return b.probability - a.probability;
    })
    .filter(
      (bird) => bird.probability > threshold && bird.label != "Background"
    )
    .slice(0, 3);

  if (top3.length > 0) {
    text = top3[0].label;
  }

  document.getElementById(id + "text").innerHTML =
    '<a href="https://en.wikipedia.org/wiki/' +
    text.replace(" ", "_") +
    '" target="_blank">' +
    text +
    "</a>";
  document.getElementById(id + "loader").style.display = "none";
}

function clickedSample(e) {
  const id = imgCount;
  createGalleryImage(e.src, id);

  imgCount++;
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
