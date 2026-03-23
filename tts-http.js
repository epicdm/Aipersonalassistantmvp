const http = require("http");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PORT = 3007;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (req.method === "POST" && req.url === "/tts") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { text, voice = "en-US-JennyNeural" } = JSON.parse(body);
        if (!text) {
          res.writeHead(400);
          return res.end("Missing text");
        }

        const tmpFile = path.join(os.tmpdir(), `tts-${crypto.randomBytes(6).toString("hex")}.mp3`);

        execFile("/home/epicadmin/.local/bin/edge-tts", ["--voice", voice, "--text", text, "--write-media", tmpFile], { timeout: 30000 }, (err) => {
          if (err) {
            console.error("[TTS] edge-tts error:", err.message);
            res.writeHead(500);
            return res.end("TTS failed");
          }

          const audio = fs.readFileSync(tmpFile);
          fs.unlinkSync(tmpFile);

          res.writeHead(200, {
            "Content-Type": "audio/mpeg",
            "Content-Length": audio.length,
          });
          res.end(audio);
        });
      } catch (e) {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => console.log(`[TTS] HTTP server on :${PORT}`));
