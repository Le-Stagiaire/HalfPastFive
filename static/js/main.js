(function() {
  // utils for formatting time gathered on region
  var formatTime = function(time) {
    return [
      Math.floor((time % 3600) / 60), // minutes
      ("00" + Math.floor(time % 60)).slice(-2) // seconds
    ].join(":");
  };

  // First create a wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: ".wavesurfer",
    waveColor: "white",
    progressColor: "grey"
  });

  wavesurfer.on("ready", function() {
    wavesurfer.enableDragSelection({ drag: false });
    var timeline = Object.create(WaveSurfer.Timeline);
    timeline.init({
      wavesurfer: wavesurfer,
      container: ".wavesurfer-timeline"
    });
  });

  document.querySelector(".toggle-play").addEventListener("click", function() {
    wavesurfer.playPause();
  });

  wavesurfer.on("region-created", function(region) {
    document
      .querySelector("#start")
      .setAttribute("value", formatTime(region["start"]));
    document
      .querySelector("#stop")
      .setAttribute("value", formatTime(region["end"]));
  });

  document
    .querySelector(".download-form")
    .addEventListener("submit", function(e) {
      e.preventDefault();
      const xhttp = new XMLHttpRequest();
      xhttp.open("POST", "/", true);
      xhttp.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded"
      );
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
})();
