import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const plist = resolve('ios/App/App/Info.plist');
if (process.platform !== 'darwin' || !existsSync(plist)) {
  throw new Error('Run this on your Mac after adding the iOS project (npx cap add ios).');
}
const descriptions = {
  NSMotionUsageDescription: 'GameRun uses motion and fitness data to count your steps and estimate distance during an activity pass.',
  NSHealthShareUsageDescription: 'GameRun reads your steps and walking distance from Apple Health to calculate earned screen time.',
};
for (const [key, value] of Object.entries(descriptions)) {
  // Preserve descriptions already customized in Xcode.
  let existing = '';
  try { existing = execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); } catch {}
  if (existing) continue;
  try { execFileSync('/usr/libexec/PlistBuddy', ['-c', `Delete :${key}`, plist], { stdio: 'pipe' }); } catch {}
  execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plist]);
}
console.log('Motion and Apple Health privacy descriptions are configured. Enable HealthKit in Xcode Signing & Capabilities.');