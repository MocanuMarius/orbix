// node scripts/perf/android/restart-emu.mjs [--window]   restart the emulator (host GPU), headless unless --window
import {restartEmulator} from './benchlib.mjs';
await restartEmulator({noWindow: !process.argv.includes('--window')}); console.log('emulator restarted', process.argv.includes('--window') ? 'windowed' : 'no-window');
