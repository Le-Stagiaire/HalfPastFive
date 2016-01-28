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
    template_path=os.path.join(os.path.dirname(__file__), "templates"))

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
        out = subprocess.run(
            ['youtube-dl', url, '-f', '140', '-o', path,
             '--print-json'], stdout=subprocess.PIPE)
        out = json.loads(out.stdout.decode('utf-8'))
        self.write(json_encode(out['title'] + '.' + out['ext']))


if __name__ == "__main__":
    app = server
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
