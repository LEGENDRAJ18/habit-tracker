const playwright = require('C:\Users\Mannraj\AppData\Local\npm-cache\_npx\e41f203b7505f1fb\node_modules\playwright');
const { chromium } = playwright;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMsgs = [];
  const netReqs = [];
  const navigations = [];

  page.on('console', msg => consoleMsgs.push('[' + msg.type() + '] ' + msg.text()));
  page.on('request', req => {
    const url = req.url();
    if (url.includes('supabase') || url.includes('localhost:3000')) {
      netReqs.push(req.method() + ' ' + url.substring(0, 130));
    }
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });

  console.log('-- Navigating to login page --');
  try {
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  } catch(e) { console.log('Note:', e.message.substring(0,100)); }

  console.log('URL:', page.url());
  await page.waitForTimeout(2000);

  console.log('\n-- Console --');
  consoleMsgs.forEach(m => console.log(m));

  console.log('\n-- Navigations --');
  navigations.forEach(u => console.log(u));

  console.log('\n-- Network (first 30) --');
  netReqs.slice(0,30).forEach(r => console.log(r));

  await browser.close();
})().catch(e => console.error('FATAL:', e));
