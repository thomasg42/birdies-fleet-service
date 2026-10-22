// Load linkedom and Playwright from ~/dev/fga-tools (or $FGA_TOOLS).
// The built site stays zero-dependency. Do not npm install inside the vault.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function toolsRoot() {
  return process.env.FGA_TOOLS || join(homedir(), 'dev', 'fga-tools');
}

export function toolsRequire() {
  return createRequire(join(toolsRoot(), 'package.json'));
}

export function loadLinkedom() {
  return toolsRequire()('linkedom');
}

export function loadPlaywright() {
  return toolsRequire()('playwright');
}
