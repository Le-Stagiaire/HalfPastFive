(function() {
  // First create a wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: ".wavesurfer",
    waveColor: "white",
    progressColor: "grey"
  });

  wavesurfer.on("ready", function() {
    wavesurfer.enableDragSelection({});
    var timeline = Object.create(WaveSurfer.Timeline);
    timeline.init({
      wavesurfer: wavesurfer,
      container: ".wavesurfer-timeline"
    });
  });

  document.querySelector(".toggle-play").addEventListener("click", function() {
    wavesurfer.playPause();
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
