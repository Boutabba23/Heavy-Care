// Dev launcher: starts the Next.js dev server and launches Electron against
// it, so the UI hot-reloads while the Electron shell stays running.
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const rendererUrl = "http://localhost:5555";
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function waitFor(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(url, (res) => {
        res.resume(); // drain
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        return reject(new Error(`Timed out waiting for ${url}`));
      }
      setTimeout(ping, 500);
    };
    ping();
  });
}

async function main() {
  const rendererDir = path.join(__dirname, "renderer");

  const renderer = spawn(npmCmd, ["run", "dev"], {
    cwd: rendererDir,
    stdio: "inherit",
    shell: true,
  });

  renderer.on("exit", (code) => {
    console.log(`Renderer exited with code ${code}`);
    process.exit(code ?? 0);
  });

  try {
    console.log("Waiting for Next.js dev server...");
    await waitFor(rendererUrl);
  } catch (err) {
    console.error(err.message);
    renderer.kill();
    process.exit(1);
  }

  const electron = spawn(npmCmd, ["run", "start"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ELECTRON_RENDERER_URL: rendererUrl },
  });

  electron.on("exit", () => {
    renderer.kill();
    process.exit(0);
  });
}

process.on("SIGINT", () => process.exit(0));

main();
