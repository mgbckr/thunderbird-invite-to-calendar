const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
fs.mkdirSync('dist', { recursive: true });
const result = spawnSync('zip', ['-q', '-r', '../dist/invitation-mirror.xpi', '.'], { cwd: 'extension', stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status) process.exit(result.status);
console.log('Built dist/invitation-mirror.xpi');
