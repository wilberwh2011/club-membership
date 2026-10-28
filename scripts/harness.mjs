// Local UI harness (research R8): serves the built dist/*.html pages on http://localhost:5173 with a stub
// `google.script.run` that forwards each call to POST /rpc/<function>.
// For now every /rpc call answers { ok: false, error: { code: 'INTERNAL' } }; T077 wires it to the use cases
// with memory adapters and synthetic fixtures.
// Usage: npm run build && npm run harness   (PORT=<n> to change the port)
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PAGES = new Set(['register', 'signin', 'app']);
const DEFAULT_PAGE = 'register';
const MAX_BODY_BYTES = 1_000_000;

// Browser-side stand-in for google.script.run: run.withSuccessHandler(f).withFailureHandler(g).fn(...args)
export const GOOGLE_SCRIPT_RUN_STUB = `<script>
(function () {
  function runner(success, failure, userObject) {
    var base = {
      withSuccessHandler: function (f) { return runner(f, failure, userObject); },
      withFailureHandler: function (f) { return runner(success, f, userObject); },
      withUserObject: function (o) { return runner(success, failure, o); }
    };
    return new Proxy(base, {
      get: function (target, name) {
        if (name in target || typeof name !== 'string') return target[name];
        return function () {
          var args = Array.prototype.slice.call(arguments);
          fetch('/rpc/' + encodeURIComponent(name), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args)
          })
            .then(function (res) {
              if (!res.ok) throw new Error('RPC ' + name + ' failed with HTTP ' + res.status);
              return res.json();
            })
            .then(function (value) { if (success) success(value, userObject); })
            .catch(function (err) { if (failure) failure(err, userObject); });
        };
      }
    });
  }
  window.google = { script: { run: runner(null, null, undefined) } };
})();
</script>`;

const defaultRpc = async () => ({ ok: false, error: { code: 'INTERNAL' } });

function injectStub(html) {
  return html.includes('<head>') ? html.replace('<head>', () => `<head>\n${GOOGLE_SCRIPT_RUN_STUB}`) : GOOGLE_SCRIPT_RUN_STUB + html;
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(body);
}

export function startHarness({ port = Number(process.env.PORT ?? 5173), rpc = defaultRpc } = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'POST' && url.pathname.startsWith('/rpc/')) {
        const name = decodeURIComponent(url.pathname.slice('/rpc/'.length));
        const raw = await readBody(req);
        const args = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(args)) return send(res, 400, 'application/json', JSON.stringify({ error: 'args must be an array' }));
        return send(res, 200, 'application/json', JSON.stringify(await rpc(name, args)));
      }
      if (req.method === 'GET') {
        const page = url.pathname === '/' ? (url.searchParams.get('page') ?? DEFAULT_PAGE) : url.pathname.slice(1).replace(/\.html$/, '');
        const file = join(DIST, `${page}.html`);
        if (PAGES.has(page) && existsSync(file)) return send(res, 200, 'text/html', injectStub(readFileSync(file, 'utf8')));
        return send(res, 404, 'text/plain', existsSync(DIST) ? 'Not found' : 'Not found: run `npm run build` first');
      }
      return send(res, 405, 'text/plain', 'Method not allowed');
    } catch {
      return send(res, 500, 'application/json', JSON.stringify({ ok: false, error: { code: 'INTERNAL' } }));
    }
  });
  return new Promise((resolveServer) => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startHarness().then((server) => {
    process.stdout.write(`Harness running at http://localhost:${server.address().port}/ (pages: register, signin, app)\n`);
  });
}
