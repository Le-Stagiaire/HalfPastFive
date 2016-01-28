$(document).ready(function() {
  $('form').on('submit', function(e) {
    var $form = $(e.target);
    e.preventDefault();
    $.post($form.attr('action'), $form.serialize(), function(response) {
      alert(response);
      var wavesurfer = Object.create(WaveSurfer);
      wavesurfer.init({
        container: '.wavesurfer', waveColor: 'white',
        progressColor: 'grey'})
      wavesurfer.load('/static/downloads/' + response);
    });
  });
});
