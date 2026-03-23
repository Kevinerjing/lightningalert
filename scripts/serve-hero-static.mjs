import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const heroRoot = path.resolve(__dirname, "../hero");
const port = Number(process.env.HERO_E2E_PORT || 4173);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
]);

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function safeResolve(urlPathname) {
  const cleaned = decodeURIComponent(urlPathname.split("?")[0].split("#")[0]);
  const relative = cleaned === "/" ? "/index.html" : cleaned;
  const target = path.resolve(heroRoot, `.${relative}`);
  if (!target.startsWith(heroRoot)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  if (!["GET", "HEAD"].includes(method)) {
    send(res, 405, "Method Not Allowed");
    return;
  }

  if ((req.url || "").startsWith("/favicon.ico")) {
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const filePath = safeResolve(req.url || "/");
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  let finalPath = filePath;
  if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
    finalPath = path.join(finalPath, "index.html");
  }

  if (!fs.existsSync(finalPath) || !fs.statSync(finalPath).isFile()) {
    send(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(finalPath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Hero static server listening on http://127.0.0.1:${port}/index.html`);
});
