// Load .env file and pass to PM2
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const env = {};
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Remove surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  } catch (e) {}
  return env;
}

const envVars = loadEnv('/opt/bff/.env');

module.exports = {
  apps: [{
    name: 'epic-ai-ami',
    script: '/opt/bff/ami-listener.js',
    cwd: '/opt/bff',
    env: envVars,
    autorestart: true,
    max_restarts: 50,
    restart_delay: 5000,
  }]
};
