import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log("Installing packages...");
  execSync('npm install redis @socket.io/redis-adapter', { stdio: 'inherit', shell: true });

  console.log("Copying files...");
  fs.copyFileSync(path.join(__dirname, 'src/files/server.js'), path.join(__dirname, 'src/server.js'));
  fs.copyFileSync(path.join(__dirname, 'src/files/redis.js'), path.join(__dirname, 'src/config/redis.js'));
  fs.copyFileSync(path.join(__dirname, 'src/files/socketState.js'), path.join(__dirname, 'src/sockets/socketState.js'));
  fs.copyFileSync(path.join(__dirname, 'src/files/socketServer.js'), path.join(__dirname, 'src/sockets/socketServer.js'));

  console.log("Setup complete safely!");
} catch (e) {
  console.error("Error heavily installing setup script:", e);
}
