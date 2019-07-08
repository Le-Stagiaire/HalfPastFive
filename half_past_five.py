from datetime import timedelta
from logging import getLogger
from tornado.web import Application, RequestHandler, url as hpf_url
from tornado.escape import json_encode

import json
import os
import subprocess
import tornado.ioloop

log = getLogger('half_past_five')

log.setLevel(20)

server = Application(
    static_path=os.path.join(os.path.dirname(__file__), "static"),
    template_path=os.path.join(os.path.dirname(__file__), "templates"),
    debug=True)

# wdb_tornado(server, start_disabled=True)


class url(object):
    def __init__(self, url, name=None, suffix=None):
        self.url = url
        self.name = name
        self.suffix = suffix or ''

    def __call__(self, cls):
        server.add_handlers(
            r'.*$',
            (hpf_url(self.url, cls, name=self.name or (
                cls.__name__ + self.suffix)),)
        )
        return cls


@url(r'/')
class MainHandler(RequestHandler):
    def get(self):
        self.render("index.html")

    def post(self):
        self.set_header('Content-Type', 'application/json')
        url = self.get_argument('url', '')
        download_path = os.path.join(
            'static', 'downloads', '%(title)s.%(ext)s')
        out = subprocess.run(
            ['youtube-dl', url, '-f', '140', '-o', download_path,
             '--print-json'], stdout=subprocess.PIPE)
        out = json.loads(out.stdout.decode('utf-8'))
        self.write(out)
        self.finish()


@url(r'/crop_and_download')
class CropHandler(RequestHandler):

    def post(self):
        # Extract start and end from form params
        start = [
            int(time) for time in [
                self.get_argument('minute-start'),
                self.get_argument('second-start')
            ]
        ]
        end = [
            int(time) for time in [
                self.get_argument('minute-end'),
                self.get_argument('second-end')
            ]
        ]
        # ffmpeg need a delay instead of a end position
        # ex : start = 0:15 and end = 1:45 means
        # we need to pass start = 0:15 and stop = 1:30 to ffmpeg
        ffmpeg_delay = []
        timedelta_start = timedelta(minutes=start[0], seconds=start[1])
        timedelta_end = timedelta(minutes=end[0], seconds=end[1])
        if timedelta_end == timedelta_start:
            self.write(json_encode('Pas de sélection'))
            self.finish()
        elif timedelta_end < timedelta_start:
            self.write(json_encode('Stop avant start'))
            self.finish()
        timedelta_delay = timedelta_end - timedelta_start
        ffmpeg_start = '%0.2d:%0.2d' % (start[0], start[1])
        ffmpeg_delay = '%0.2d:%0.2d' % (
            int(timedelta_delay.seconds / 60), timedelta_delay.seconds % 60)

        # get audio and crop-audio filenames
        audio_filename = self.get_argument('media-name')
        audio_title = audio_filename.split('.')[0]
        cut_filename = '{}_cut.{}'.format(audio_title, 'mp3')

        # crop the audio
        subprocess.run(
            ['ffmpeg', '-i', audio_filename, '-ss', ffmpeg_start,
             '-t', ffmpeg_delay, '-codec:a', 'libmp3lame', '-qscale:a', '3',
             cut_filename])

        with open(cut_filename, "rb") as f:
            song = f.read()
        os.remove(audio_filename)
        os.remove(cut_filename)
        self.set_header('Content-Type', 'audio/mpeg')
        self.set_header(
            'Content-Disposition', 'attachment; filename=%s' % (
                cut_filename[len('static/downloads/'):]
            )
        )
        self.write(song)


if __name__ == "__main__":
    app = server
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
