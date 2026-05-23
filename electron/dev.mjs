import electronPath from "electron";
import { spawn } from "node:child_process";

const devUrl = "http://127.0.0.1:5173";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const vite = spawn(npmCommand, ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
  stdio: "inherit"
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForVite = async () => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60000) {
    try {
      const response = await fetch(devUrl);
      if (response.ok) return;
    } catch {
      await wait(500);
    }
  }
  throw new Error("Timed out waiting for the Vite dev server.");
};

try {
  await waitForVite();
  const desktop = spawn(electronPath, ["."], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl
    }
  });

  desktop.on("exit", (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
} catch (error) {
  vite.kill();
  console.error(error);
  process.exit(1);
}
