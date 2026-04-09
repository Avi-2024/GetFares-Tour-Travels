import { browser } from 'k6/experimental/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_web_vital_fcp: ['p(95)<3000'],
    browser_web_vital_lcp: ['p(95)<5000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';

export default async function () {
  const page = browser.newPage();

  try {
    await page.goto(BASE_URL);
    
    check(page, {
      'page loaded': (p) => p.url() === `${BASE_URL}/`,
    });

    await page.waitForSelector('body', { timeout: 5000 });
    
    const screenshot = page.screenshot();
    check(screenshot, {
      'screenshot taken': (s) => s.length > 0,
    });

  } finally {
    page.close();
  }
}
