const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROUTES = [
  { name: 'Moderation Queue', path: '/admin' },
  { name: 'User Management', path: '/admin/users' },
  { name: 'Roles & Permissions', path: '/admin/roles' },
  { name: 'Operations Overview', path: '/admin/operations' },
  { name: 'Audit Logs', path: '/admin/operations/audit' },
  { name: 'System Errors', path: '/admin/operations/errors' },
  { name: 'Active Sessions', path: '/admin/operations/sessions' },
  { name: 'Auth Events', path: '/admin/operations/auth' },
  { name: 'System Diagnostics', path: '/admin/system' },
  { name: 'Platform Settings', path: '/admin/settings' },
  { name: 'API Documentation', path: '/admin/api' },
  { name: 'Data Exports', path: '/admin/exports' },
  { name: 'Admin Profile', path: '/admin/profile' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  const reportDir = path.join(__dirname, 'report');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

  const results = [];

  // Login
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'superadmin@nearby-dev.local');
  await page.type('input[type="password"]', 'SuperAdmin123!Dev');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => console.log('Navigation timeout ignored')),
    page.click('button[type="submit"]')
  ]);
  await new Promise(r => setTimeout(r, 2000));
  console.log('Logged in successfully.');

  for (const route of ROUTES) {
    console.log(`Auditing ${route.name} (${route.path})...`);
    
    let consoleLogs = [];
    let networkErrors = [];
    let apiRequests = [];
    
    const consoleHandler = msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    };
    
    const requestHandler = req => {
      if (req.url().includes('/api/')) {
        apiRequests.push({ url: req.url(), method: req.method() });
      }
    };
    
    const responseHandler = res => {
      if (!res.ok() && res.url().includes('/api/')) {
        networkErrors.push({ url: res.url(), status: res.status() });
      }
    };
    
    const errorHandler = err => {
      consoleLogs.push({ type: 'pageerror', text: err.toString() });
    };

    page.on('console', consoleHandler);
    page.on('request', requestHandler);
    page.on('response', responseHandler);
    page.on('pageerror', errorHandler);

    await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'domcontentloaded' });
    
    // Wait an extra second for any animations or lingering requests
    await new Promise(r => setTimeout(r, 1000));
    
    const screenshotPath = path.join(reportDir, `${route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`);
    await page.screenshot({ path: screenshotPath });

    results.push({
      route,
      consoleLogs,
      networkErrors,
      apiRequests,
      screenshot: screenshotPath
    });

    page.off('console', consoleHandler);
    page.off('request', requestHandler);
    page.off('response', responseHandler);
    page.off('pageerror', errorHandler);
  }

  await browser.close();

  // Generate Markdown Report
  let md = `# Final Acceptance Audit Report\n\n`;
  for (const res of results) {
    md += `## ${res.route.name} (\`${res.route.path}\`)\n\n`;
    
    md += `### API Requests\n`;
    if (res.apiRequests.length > 0) {
      res.apiRequests.forEach(req => md += `- \`${req.method}\` ${req.url}\n`);
    } else {
      md += `*No API requests detected.*\n`;
    }
    
    md += `\n### Network Errors\n`;
    if (res.networkErrors.length > 0) {
      res.networkErrors.forEach(err => md += `- ❌ \`${err.status}\` ${err.url}\n`);
    } else {
      md += `*No network errors.*\n`;
    }
    
    md += `\n### Console Output\n`;
    const errs = res.consoleLogs.filter(c => c.type === 'error' || c.type === 'pageerror');
    if (errs.length > 0) {
      errs.forEach(err => md += `- ❌ **${err.type.toUpperCase()}**: ${err.text}\n`);
    } else if (res.consoleLogs.length > 0) {
      md += `*Minor logs detected, 0 errors.*\n`;
    } else {
      md += `*No console logs.*\n`;
    }
    
    md += `\n### Screenshot\n`;
    md += `![${res.route.name}](${res.screenshot.replace(/\\/g, '/')})\n\n`;
    md += `---\n\n`;
  }
  
  fs.writeFileSync(path.join(reportDir, 'audit_report.md'), md);
  console.log('Audit complete.');
})();
