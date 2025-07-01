const { exec } = require('child_process');

console.log('Starting TypeScript build with debug output...\n');

// Run tsc with verbose output
const tsc = exec('npx tsc --listFiles --listEmittedFiles');

tsc.stdout.on('data', (data) => {
  console.log(data.toString());
});

tsc.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error(`\nBuild failed with code ${code}`);
    console.log('\nChecking TypeScript version...');
    exec('npx tsc --version', (err, stdout, stderr) => {
      console.log('TypeScript version:', stdout.trim());
    });
    console.log('\nChecking for missing files...');
    exec('ls -la src/', (err, stdout, stderr) => {
      console.log('src/ directory contents:\n', stdout);
    });
    process.exit(1);
  } else {
    console.log('\nBuild completed successfully!');
    process.exit(0);
  }
});