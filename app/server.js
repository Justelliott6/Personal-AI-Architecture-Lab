const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { JsonStore } = require("./persistence");
const { SystemCore } = require("./core");

const staticRoot = path.join(__dirname, "static");
const core = new SystemCore(new JsonStore(path.join(__dirname, "..", "data", "state.json")));

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

async function handleApi(request, response) {
  try {
    const payload = await readJson(request);
    let result;
    if (request.url === "/api/chat") result = await core.chat(payload.message || "");
    else if (request.url === "/api/provider") result = core.setProvider(payload.provider || "");
    else if (request.url === "/api/approval") result = core.setApproval(Boolean(payload.approved));
    else return sendJson(response, 404, { error: "Not found." });
    sendJson(response, 200, result);
  } catch (error) {
    const status = error.message === "Unknown provider." || error.message === "Message cannot be empty." ? 400 : 502;
    sendJson(response, status, { error: status === 502 ? `Provider request failed: ${error.message}` : error.message });
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/api/state" && request.method === "GET") return sendJson(response, 200, core.view());
  if (request.url && request.url.startsWith("/api/") && request.method === "POST") return handleApi(request, response);
  const requested = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.resolve(staticRoot, `.${requested}`);
  if (!filePath.startsWith(`${staticRoot}${path.sep}`) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    return response.end("Not found.");
  }
  response.writeHead(200);
  return fs.createReadStream(filePath).pipe(response);
});

if (require.main === module) {
  server.listen(8000, "localhost", () => {
    console.log("Personal AI Architecture Lab: http://localhost:8000");
  });
}

module.exports = { server, core };
