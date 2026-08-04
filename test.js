const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting preview server...');
  const server = spawn('npm.cmd', ['run', 'preview'], { cwd: './client', stdio: 'pipe', shell: true });
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Users\\marel\\.cache\\puppeteer\\chrome\\win64-151.0.7922.47\\chrome-win64\\chrome.exe'
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.toString());
  });

  console.log('Navigating to localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await browser.close();
  server.kill();
  console.log('Done.');
})();
