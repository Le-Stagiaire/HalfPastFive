var wavesurfer;
var region;

function init() {
  // First create a wavesurfer instance
  wavesurfer = WaveSurfer.create({
    container: ".wavesurfer",
    waveColor: "red",
    progressColor: "#ff0000",
    plugins: [WaveSurfer.regions.create({ drag: false })]
  });

  wavesurfer.on("ready", () => {
    wavesurfer.enableDragSelection({ drag: false });
  });

  document.querySelector(".toggle-play").addEventListener("click", () => {
    wavesurfer.playPause();
  });
  document.body.onkeyup = function(e) {
    if (e.keyCode == 32) {
      wavesurfer.playPause();
    }
  };

  wavesurfer.on("region-created", region => {
    wavesurfer.clearRegions();
  });

  wavesurfer.on("region-update-end", region => {
    const start = formatTime(region["start"]);
    const end = formatTime(region["end"]);
    const [minute_start, second_start] = start.split(":");
    const [minute_end, second_end] = end.split(":");
    document.querySelector("#minute-start").setAttribute("value", minute_start);
    document.querySelector("#second-start").setAttribute("value", second_start);
    document.querySelector("#minute-end").setAttribute("value", minute_end);
    document.querySelector("#second-end").setAttribute("value", second_end);
    wavesurfer.seekTo(region["start"] / wavesurfer.getDuration());
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
  wavesurfer.seekTo(0);
  document.querySelector("#minute-start").setAttribute("value", "00");
  document.querySelector("#minute-start").setAttribute("value", "00");
  document.querySelector("#minute-end").setAttribute("value", "00");
  document.querySelector("#minute-end").setAttribute("value", "00");
}
