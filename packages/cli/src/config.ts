import fs from 'fs';
import path from 'path';
import os from 'os';

const configDir = path.join(os.homedir(), '.config', 'orchestrator');
const configFile = path.join(configDir, 'config.json');

interface CLIConfig {
  controlPlaneUrl: string;
}

function loadConfig(): CLIConfig {
  try {
    const raw = fs.readFileSync(configFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { controlPlaneUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:3000' };
  }
}

export function getControlPlaneUrl(hostOverride?: string): string {
  if (hostOverride) return hostOverride;
  return loadConfig().controlPlaneUrl;
}

export function saveControlPlaneUrl(url: string) {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify({ controlPlaneUrl: url }, null, 2));
}
