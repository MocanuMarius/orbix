// Restart the emulator in a GPU mode, hands-off: node scripts/perf/android/emu.mjs host|swiftshader_indirect
// Kills the running emulator (adb emu kill: only this emulator), boots Orbix_Pixel, locks landscape, opens Chrome on the game.
import {execFileSync, spawn} from 'node:child_process';
import {delay} from './cdp.mjs';
const mode = process.argv[2] || 'host';
const env = {...process.env, ANDROID_SDK_ROOT: 'F:\\Android\\sdk', ANDROID_AVD_HOME: 'F:\\Android\\avd'};
const adb = (...a) => execFileSync('adb', a, {encoding: 'utf8', env}).trim();
const attached = () => { try { return /emulator-\d+\s+device/.test(adb('devices')); } catch { return false; } };
const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (fn()) return; } catch {} await delay(2000); } throw new Error('timeout'); };
if (attached()) { try { adb('emu', 'kill'); } catch {} await until(() => !attached(), 90000); await delay(4000); }
spawn('F:/Android/sdk/emulator/emulator.exe', ['-avd', 'Orbix_Pixel', '-gpu', mode, '-no-snapshot-save', '-no-boot-anim', '-no-audio'], {env, detached: true, stdio: 'ignore'}).unref();
await until(attached, 240000); await until(() => adb('shell', 'getprop', 'sys.boot_completed') === '1', 300000); await delay(8000);
adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'); adb('shell', 'cmd', 'window', 'user-rotation', 'lock', '1');
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'http://10.0.2.2:4173/game.html?cards=1', 'com.android.chrome');
await delay(8000);
console.log('emulator up, gpu', mode);
