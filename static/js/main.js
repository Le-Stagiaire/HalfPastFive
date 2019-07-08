var wavesurfer;
var wavesurferRegion;
var scale = 1;

function init() {
  // First create a wavesurfer instance
  wavesurfer = WaveSurfer.create({
    container: "#wavesurfer-wrapper",
    waveColor: "red",
    progressColor: "#ff0000",
    plugins: [
      WaveSurfer.regions.create({ id: "region", drag: false }),
      WaveSurfer.timeline.create({
        container: "#wavesurfer-timeline-wrapper"
      })
    ]
  });

  wavesurfer.on("ready", () => {
    wavesurfer.enableDragSelection({ drag: false });
  });

  document.getElementById("toggle-play").addEventListener("click", () => {
    wavesurfer.playPause();
  });
  document.body.onkeyup = function(e) {
    if (e.keyCode == 32) {
      wavesurfer.playPause();
    }
  };
  document.body.onkeydown = function(e) {
    if (e.keyCode == 37 && wavesurferRegion) {
      wavesurferRegion.onResize(-0.1 * wavesurfer.params.minPxPerSec, "start");
      wavesurfer.seekTo(wavesurferRegion["start"] / wavesurfer.getDuration());
    }
    if (e.keyCode == 39 && wavesurferRegion) {
      wavesurferRegion.onResize(0.5);
    }
  };

  wavesurfer.on("play", () => {
    let current = wavesurfer.getCurrentTime();
    if (inBetweenRegion(current)) {
      wavesurferRegion.on("out", regionOut);
    } else {
      wavesurfer.un("out");
    }
  });

  document.querySelector("#wavesurfer-wrapper").onwheel = e => {
    e.preventDefault();
    scale = scale + (-e.deltaY > 0 ? 1 : -1);
    scale = Math.min(Math.max(5, scale), 200);
    wavesurfer.zoom(scale);
  };

  wavesurfer.on("seek", position => {
    if (!inBetweenRegion(position * wavesurfer.getDuration())) {
      wavesurfer.clearRegions();
    }
  });

  wavesurfer.on("region-created", region => {
    wavesurfer.clearRegions();
  });

  wavesurfer.on("region-update-end", region => {
    // Update inputs for from post
    wavesurferRegion = region;
    const start = formatTime(region["start"]);
    const end = formatTime(region["end"]);
    const [minuteStart, secondStart] = start.split(":");
    const [minuteEnd, secondEnd] = end.split(":");
    document.getElementById("minute-start").setAttribute("value", minuteStart);
    document.getElementById("second-start").setAttribute("value", secondStart);
    document.getElementById("minute-end").setAttribute("value", minuteEnd);
    document.getElementById("second-end").setAttribute("value", secondEnd);
    // move cursor to the regions's start
    wavesurfer.seekTo(region["start"] / wavesurfer.getDuration());

    /* Functionality that I am not sure is good for the application.
       Still, it's a working
       audio-selection-extraction-into-a-new-wavesurfer tool.

    // Extract audio from region to create a new wavesurfer for the selection
    var originalBuffer = wavesurfer.backend.buffer;
    var newBufferLength =
      (region.end - region.start) * originalBuffer.sampleRate;
    var newBuffer = wavesurfer.backend.ac.createBuffer(
      originalBuffer.numberOfChannels,
      newBufferLength,
      originalBuffer.sampleRate
    );

    // Copy each canal audio
    for (var canal = 0; canal < newBuffer.numberOfChannels; canal++) {
      // Create an array with the size of our audio selection
      var newBufferAudioContent = new Float32Array(newBufferLength);
      // Fill this array with the audio content
      // starting from the beginning of our selection.
      // The size of our array will determine when we stop the copy
      // since its length is the size of our selection.
      originalBuffer.copyFromChannel(
        newBufferAudioContent,
        canal,
        region.start * originalBuffer.sampleRate
      );
      newBuffer.copyToChannel(newBufferAudioContent, canal);
    }

    wavesurferSelection = WaveSurfer.create({
      container: "#wavesurfer-selection-wrapper",
      waveColor: "red",
      progressColor: "#ff0000",
      plugins: [
        WaveSurfer.timeline.create({
          container: "#wavesurfer-selection-timeline-wrapper"
        })
      ]
    });
    wavesurferSelection.loadDecodedBuffer(newBuffer);
    wavesurferSelection.drawer.on("click", region => {
      focusedWavesurfer = wavesurferSelection;
    });*/
  });

  document.getElementById("download-form").addEventListener("submit", e => {
    e.preventDefault();
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    const params = "url=" + e.target.elements["url"].value;

    xhttp.onreadystatechange = () => {
      if (xhttp.readyState == 4 && xhttp.status == 200) {
        const response = JSON.parse(xhttp.response);
        wavesurfer.load("/" + response._filename);
        document.getElementById("video-title").textContent = response.title;
        document
          .getElementById("video-thumbnail")
          .setAttribute("src", response.thumbnail);
        document
          .getElementById("video-link")
          .setAttribute("href", response.webpage_url);
        document.querySelectorAll(".hidden").forEach(el => {
          el.classList.remove("hidden");
        });
        document
          .getElementById("media-name")
          .setAttribute("value", response._filename);
      }
    };

    xhttp.send(params);
  });
}

// utils for formatting time gathered on region
function formatTime(time) {
  return [
    Math.floor((time % 3600) / 60), // minutes
    ("00" + Math.floor(time % 60)).slice(-2) // seconds
  ].join(":");
}

// utils for removing region
function removeRegion() {
  wavesurfer.clearRegions();
  wavesurfer.seekTo(0);
  document.getElementById("minute-start").setAttribute("value", "00");
  document.getElementById("second-start").setAttribute("value", "00");
  document.getElementById("minute-end").setAttribute("value", "00");
  document.getElementById("second-end").setAttribute("value", "00");
}

var regionOut = e => {
  wavesurfer.pause();
  wavesurfer.seekTo(wavesurferRegion["start"] / wavesurfer.getDuration());
};

function inBetweenRegion(current) {
  return current >= wavesurferRegion.start && current <= wavesurferRegion.end;
}
