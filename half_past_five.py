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

from wdb.ext import wdb_tornado
wdb_tornado(server, start_disabled=True)


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
        path = os.path.join(
            os.path.dirname(__file__), 'static', 'downloads',
            '%(title)s.%(ext)s')
        cut_path = os.path.join(
            os.path.dirname(__file__), 'static', 'downloads',
            '%(title)s_cut.%(ext)s')
        if url:
            out = subprocess.run(
                ['youtube-dl', url, '-f', '140', '-o', path,
                 '--print-json'], stdout=subprocess.PIPE)
            out = json.loads(out.stdout.decode('utf-8'))
            self.write(json_encode(out['title'] + '.' + out['ext']))
            self.finish()
        title = self.get_argument('media-name').split('.')[0]
        media_name = dict(title=title, ext='m4a')
        cut_media_name = dict(title=title, ext='mp3')
        filename = path % media_name
        cut_filename = cut_path % cut_media_name
        start = '00:00:10'
        stop = '00:01:10'
        subprocess.run(
            ['ffmpeg', '-i', filename, '-ss', start, '-t', stop,
             '-codec:a', 'libmp3lame', '-qscale:a', '3', cut_filename])
        with open(cut_filename, "rb") as f:
            song = f.read()

        self.set_header('Content-Type', 'audio/mpeg')
        self.set_header(
            'Content-Disposition', 'attachment; filename=%s' % cut_filename)
        self.write(song)


if __name__ == "__main__":
    app = server
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
