#!/usr/bin/env python

from datetime import timedelta
from logging import getLogger
from tornado.web import Application, RequestHandler, url as hpf_url
from tornado.escape import json_encode

import json
import os
import subprocess
import tornado.ioloop
import webbrowser

log = getLogger('half_past_five')

log.setLevel(20)

server = Application(
    static_path=os.path.join(
        os.path.dirname(__file__), "..", "static"),
    template_path=os.path.join(
        os.path.dirname(__file__), "..", "templates")
)

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
    

class BaseHandler(tornado.web.RequestHandler):

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', ' PUT, DELETE, OPTIONS')

    def options(self):
        # no body
        self.set_status(204)
        self.finish()


@url(r'/')
class MainHandler(BaseHandler):

    def get(self):
        self.render("index.html")

    def post(self):
        self.set_header('Content-Type', 'application/json')
        download_destination_folder = os.path.join(
            server.settings['static_path'], 'downloads'
        )
        if not os.path.isdir(download_destination_folder):
            os.makedirs(download_destination_folder)
        for unused_file in os.listdir(download_destination_folder):
            os.remove(os.path.join(download_destination_folder, unused_file))
        url = self.get_argument('url', '')
        download_path = os.path.join(
            server.settings['static_path'], 'downloads', '%(title)s.%(ext)s')
        out = subprocess.run(
            ['yt-dlp', url, '-f', '140', '-o', download_path,
             '--print-json'], stdout=subprocess.PIPE)
        out = json.loads(out.stdout.decode('utf-8'))
        self.write(out)
        self.finish()


@url(r'/crop_and_download')
class CropHandler(BaseHandler):

    def post(self):
        # Extract start and end from form params
        start = [
            int(time) for time in [
                self.get_argument('minute-start'),
                self.get_argument('second-start'),
                self.get_argument('millisecond-start')
            ]
        ]
        end = [
            int(time) for time in [
                self.get_argument('minute-end'),
                self.get_argument('second-end'),
                self.get_argument('millisecond-end')
            ]
        ]
        # ffmpeg need a duration instead of a end position
        # ex : start = 0:15 and end = 1:45 means
        # we need to pass start = 0:15 and stop = 1:30 to ffmpeg
        ffmpeg_delay = []
        timedelta_start = timedelta(
            minutes=start[0], seconds=start[1], milliseconds=start[2])
        timedelta_end = timedelta(
            minutes=end[0], seconds=end[1], milliseconds=end[2])
        if timedelta_end == timedelta_start:
            self.write(json_encode('Pas de sélection'))
            self.finish()
        elif timedelta_end < timedelta_start:
            self.write(json_encode('Stop avant start'))
            self.finish()
        timedelta_delay = timedelta_end - timedelta_start
        ffmpeg_start = '%0.2d:%0.2d.%0.3d' % (start[0], start[1], start[2])
        ffmpeg_delay = '%0.2d:%0.2d.%0.3d' % (
            int(timedelta_delay.seconds / 60), timedelta_delay.seconds % 60,
            round(timedelta_delay.microseconds / 1000))

        # get audio and crop-audio filenames
        audio_filename = self.get_argument('media-name')
        audio_title = audio_filename.split('.m4a')[0]
        cut_filename = '{}_cut.{}'.format(audio_title, 'mp3')
        # get filename chosen by the user
        user_filename = f"{self.get_argument('crop-title')}.mp3"
        # crop the audio
        subprocess.run(
            ['ffmpeg', '-y', '-i', audio_filename, '-ss', ffmpeg_start,
             '-t', ffmpeg_delay, '-codec:a', 'libmp3lame', '-qscale:a', '3',
             cut_filename])

        with open(cut_filename, "rb") as f:
            song = f.read()
        self.set_header('Content-Type', 'audio/mpeg')
        self.set_header(
            'Content-Disposition', f'attachment; filename={user_filename}'
        )
        self.write(song)


if __name__ == "__main__":
    app = server
    app.listen(8888)
    webbrowser.open('http://localhost:8888')
    tornado.ioloop.IOLoop.current().start()
