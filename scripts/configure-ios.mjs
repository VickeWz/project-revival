import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const plist = resolve('ios/App/App/Info.plist');
if (process.platform !== 'darwin' || !existsSync(plist)) {
  throw new Error('Run this on your Mac after adding the iOS project (npx cap add ios).');
}
const descriptions = {
  NSMotionUsageDescription: 'GameRun använder rörelsedata för att räkna steg och uppskatta distansen under aktivitetspass.',
  NSHealthShareUsageDescription: 'GameRun läser steg och gångdistans från Hälsa för att beräkna intjänad skärmtid.',
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
console.log('Skärmtid: följ docs/iphone-screen-time.md för Family Controls, App Groups och monitor-tillägget. Dessa kräver Xcode och korrekt signering.');
// Screen Time requires iOS 16; cap sync regenerates CapApp-SPM with iOS 15.
import { readFileSync, writeFileSync } from 'node:fs';
const spm = resolve('ios/App/CapApp-SPM/Package.swift');
if (existsSync(spm)) {
  const src = readFileSync(spm, 'utf8');
  const next = src.replace(/\.iOS\(\.v1[0-5]\)/g, '.iOS(.v16)');
  if (next !== src) { writeFileSync(spm, next); console.log('CapApp-SPM: lägsta iOS-version satt till 16.'); }
}
