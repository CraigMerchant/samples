function rgb2hsv() {
  var rr,
    gg,
    bb,
    r = arguments[0] / 255,
    g = arguments[1] / 255,
    b = arguments[2] / 255,
    h,
    s,
    v = Math.max(r, g, b),
    diff = v - Math.min(r, g, b),
    diffc = function(c) {
      return (v - c) / 6 / diff + 1 / 2;
    };

  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(r);
    gg = diffc(g);
    bb = diffc(b);

    if (r === v) {
      h = bb - gg;
    } else if (g === v) {
      h = 1 / 3 + rr - bb;
    } else if (b === v) {
      h = 2 / 3 + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

class GreenScreen {
  constructor() {
    this.videoWidth = 0;
    this.videoHeight = 0;
  }

  load(videoId) {
    this.video = document.getElementById(videoId);
    this.c1 = document.getElementById("c1");
    this.ctx1 = this.c1.getContext("2d");
    this.c2 = document.getElementById("c2");
    this.ctx2 = this.c2.getContext("2d");

    let self = this;
    this.video.addEventListener(
      "play",
      function() {
        self.videoWidth = self.video.videoWidth;
        self.videoHeight = self.video.videoHeight;
        self.timer();
      },
      false
    );
  }

  timer() {
    this.processFrame();
    let self = this;
    setTimeout(function() {
      self.timer();
    }, 0);
  }

  calculateDistance(c, min, max) {
    if (c < min) return min - c;
    if (c > max) return c - max;

    return 0;
  }

  processFrame() {
    this.ctx1.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);

    let frame = this.ctx1.getImageData(0, 0, this.videoWidth, this.videoHeight);
    let l = frame.data.length / 4;

    let reference = rgb2hsv(frame.data[0], frame.data[1], frame.data[2]);

    for (let i = 0; i < l; i++) {
      let r = frame.data[i * 4 + 0];
      let g = frame.data[i * 4 + 1];
      let b = frame.data[i * 4 + 2];
      let hsv = rgb2hsv(r, g, b);

      let hueDifference = Math.abs(hsv.h - reference.h);

      if (hueDifference < 20 && hsv.v > 20 && hsv.s > 20) {
        frame.data[i * 4 + 3] = 0;
      }
    }

    this.ctx2.putImageData(frame, 0, 0);
  }
}

let greenScreen = new GreenScreen();

document.addEventListener("DOMContentLoaded", () => {
  greenScreen.load("video");
});
