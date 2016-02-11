$(document).ready(function() {

  // First create a wavesurfer instance
  var wavesurfer = Object.create(WaveSurfer);
  wavesurfer.init({
    container: '.wavesurfer', waveColor: 'white',
    progressColor: 'grey'});
  var timeline =  Object.create(WaveSurfer.Timeline);
  timeline.init({
    wavesurfer: wavesurfer,
    container: ".wavesurfer-timeline"
  });

  $(".toggle-play").on('click', function() {
    wavesurfer.playPause();
  });

  $('.download-form').on('submit', function(e) {
    e.preventDefault();
    $.post(
      $(e.target).attr('action'), $(e.target).serialize(), function(response) {
        wavesurfer.load('/static/downloads/' + response);
        $(".hidden").removeClass('hidden');
        $('.cut-form').find('#media-name').val(response)
    });
  });
});
