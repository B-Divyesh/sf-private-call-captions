import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const api = 'https://api.github.com/repos/B-Divyesh/sf-private-call-captions/releases/latest';
const release = { tag_name: 'v0.1.4', html_url: 'https://github.com/B-Divyesh/sf-private-call-captions/releases/tag/v0.1.4', assets: [
  { name: 'Private.Call.Captions_0.1.4_amd64.AppImage', browser_download_url: 'https://github.com/example/linux.AppImage' },
  { name: 'Private.Call.Captions_0.1.4_x64_en-US.msi', browser_download_url: 'https://github.com/example/windows.msi' },
] };

test('@claim:download-detection loads release metadata from the GitHub API without console errors', async ({ page }) => {
  const errors: string[] = []; const requests: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  await page.route(api, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(release) }));
  await page.goto('/');
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://github.com/example/linux.AppImage');
  await expect(page.locator('#release-note')).toContainText('Version 0.1.4');
  expect(requests).toContain(api);
  expect(requests.some(url => url.includes('/releases/latest/download/latest.json'))).toBe(false);
  expect(errors.filter(message => !message.includes('503'))).toEqual([]);
});

test('shows the publishing state when release metadata is absent, without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await expect(page.locator('#download-link')).toHaveText('View downloads on GitHub');
  await expect(page.locator('#release-note')).toContainText('Downloads are being published');
  expect(errors.filter(message => !message.includes('503'))).toEqual([]);
});

test('@claim:demo-sandbox shows sample captions in an isolated demo namespace', async ({ page }) => {
  await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#demo-caption')).toContainText('24 Moss Lane');
  await expect(page.locator('#demo-transcript p')).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem('demo:private-call-captions:sample'))).toBe('shown');
  expect(await page.evaluate(() => localStorage.getItem('pcc:model'))).toBeNull();
});

test('@claim:private-demo sends no data beyond the site and listed release service', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route(api, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(release) }));
  await page.goto('/demo/');
  await page.waitForTimeout(150);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/') || url === api)).toBe(true);
});

test('@claim:offline-reload reloads the demo after its first visit', async ({ page, context }) => {
  await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/demo/');
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#demo-caption')).toContainText('24 Moss Lane');
});

test('has no serious accessibility violations and keeps keyboard focus visible', async ({ page }) => {
  await page.route(api, route => route.abort('failed'));
  await page.goto('/');
  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('uses the mobile layout and touch-sized main actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(api, route => route.abort('failed'));
  await page.goto('/');
  const box = await page.getByRole('link', { name: 'Try it with sample data' }).boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('h1').count()).toBe(1);
});
