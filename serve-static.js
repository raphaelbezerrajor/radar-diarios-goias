const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const port = portArg ? Number(portArg.slice("--port=".length)) : 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function safeResolve(urlPath) {
  const cleaned = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relative = cleaned === "/" ? "/pauteiro.html" : cleaned;
  const filePath = path.resolve(root, "." + relative);
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  const resolved = safeResolve(req.url);
  if (!resolved) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  let target = resolved;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "pauteiro.html");
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(target).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`PAUTEIRO! server running at http://127.0.0.1:${port}`);
});
