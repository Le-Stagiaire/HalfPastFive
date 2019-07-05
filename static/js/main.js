var wavesurfer;
var wavesurferSelection;
var region;
var focusedWavesurfer;

function init() {
  // First create a wavesurfer instance
  wavesurfer = WaveSurfer.create({
    container: ".wavesurfer-wrapper",
    waveColor: "red",
    progressColor: "#ff0000",
    plugins: [
      WaveSurfer.regions.create({ drag: false }),
      WaveSurfer.timeline.create({
        container: ".wavesurfer-timeline-wrapper"
      })
    ]
  });

  wavesurfer.on("ready", () => {
    wavesurfer.enableDragSelection({ drag: false });
    focusedWavesurfer = wavesurfer;
  });

  document.querySelector(".toggle-play").addEventListener("click", () => {
    focusedWavesurfer.playPause();
  });
  document.body.onkeyup = function(e) {
    if (e.keyCode == 32) {
      focusedWavesurfer.playPause();
    }
  };

  wavesurfer.drawer.on("click", region => {
    wavesurfer.clearRegions();
    focusedWavesurfer = wavesurfer;
  });

  wavesurfer.on("region-created", region => {
    wavesurfer.clearRegions();
  });

  wavesurfer.on("region-update-end", region => {
    // First remove previous wavesurferSelection
    wavesurferSelection && wavesurferSelection.destroy();
    // Update inputs for from post
    const start = formatTime(region["start"]);
    const end = formatTime(region["end"]);
    const [minuteStart, secondStart] = start.split(":");
    const [minuteEnd, secondEnd] = end.split(":");
    document.querySelector("#minute-start").setAttribute("value", minuteStart);
    document.querySelector("#second-start").setAttribute("value", secondStart);
    document.querySelector("#minute-end").setAttribute("value", minuteEnd);
    document.querySelector("#second-end").setAttribute("value", secondEnd);
    // move cursor to the regions's start
    wavesurfer.seekTo(region["start"] / wavesurfer.getDuration());

    var originalBuffer = wavesurfer.backend.buffer;
    var newBuffer = wavesurfer.backend.ac.createBuffer(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );

    var firstListIndex = region.start * originalBuffer.sampleRate;
    var secondListIndex = region.end * originalBuffer.sampleRate;
    var secondListMemAlloc =
      originalBuffer.length - region.end * originalBuffer.sampleRate;

    var newList = new Float32Array(parseInt(firstListIndex));
    var secondList = new Float32Array(parseInt(secondListMemAlloc));
    var combined = new Float32Array(originalBuffer.length);

    originalBuffer.copyFromChannel(newList, 0);
    originalBuffer.copyFromChannel(secondList, 0, secondListIndex);

    combined.set(newList);
    combined.set(secondList, firstListIndex);

    newBuffer.copyToChannel(combined, 0);
    wavesurferSelection = WaveSurfer.create({
      container: ".wavesurfer-selection-wrapper",
      waveColor: "red",
      progressColor: "#ff0000"
    });
    wavesurferSelection.loadDecodedBuffer(newBuffer);
    wavesurferSelection.drawer.on("click", region => {
      focusedWavesurfer = wavesurferSelection;
    });
  });

  document.querySelector(".download-form").addEventListener("submit", e => {
    e.preventDefault();
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    const params = "url=" + e.target.elements["url"].value;

    xhttp.onreadystatechange = () => {
      if (xhttp.readyState == 4 && xhttp.status == 200) {
        const response = xhttp.response;
        console.log(response);
        wavesurfer.load("/" + response);
        document.querySelectorAll(".hidden").forEach(el => {
          el.classList.remove("hidden");
        });
        document.querySelector("#media-name").setAttribute("value", response);
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
  wavesurferSelection.destroy();
  wavesurfer.seekTo(0);
  document.querySelector("#minute-start").setAttribute("value", "00");
  document.querySelector("#second-start").setAttribute("value", "00");
  document.querySelector("#minute-end").setAttribute("value", "00");
  document.querySelector("#second-end").setAttribute("value", "00");
}
