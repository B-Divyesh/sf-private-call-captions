import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const api = 'https://api.github.com/repos/B-Divyesh/sf-private-call-captions/releases/latest';
const release = { tag_name: 'v0.1.4', html_url: 'https://github.com/B-Divyesh/sf-private-call-captions/releases/tag/v0.1.4', assets: [
  { name: 'Private.Call.Captions_0.1.4_amd64.AppImage', browser_download_url: 'https://github.com/example/linux.AppImage' },
  { name: 'Private.Call.Captions_0.1.4_x64_en-US.msi', browser_download_url: 'https://github.com/example/windows.msi' },
] };

test('@claim:download-detection loads release metadata from the GitHub API without console errors', async ({ page }) => {
  const errors: string[] = []; const requests: string[] = []; let apiCalls = 0;
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  await page.route(api, route => { apiCalls += 1; return route.fulfill({ contentType: 'application/json', body: JSON.stringify(release) }); });
  await page.goto('/');
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://github.com/example/linux.AppImage');
  await expect(page.locator('#release-note')).toContainText('Version 0.1.4');
  await page.reload();
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://github.com/example/linux.AppImage');
  expect(apiCalls).toBe(1);
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
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('pcc:model', '/real/model.bin'));
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#demo-caption')).toContainText('24 Moss Lane');
  await expect(page.locator('#demo-transcript p')).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem('demo:private-call-captions:sample'))).toBe('shown');
  await page.locator('#demo-correct').click();
  await expect(page.locator('#demo-caption')).toContainText('The address is 24 Moss Lane');
  await page.locator('#demo-reset').click();
  await expect(page.locator('#demo-caption')).toHaveText('It is 24 Moss Lane. I will bring the signed form.');
  expect(await page.evaluate(() => localStorage.getItem('pcc:model'))).toBe('/real/model.bin');
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

test('@claim:session-tools corrects sample text and exports matching TXT and CSV files', async ({ page }) => {
  await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/demo/');
  await page.locator('#demo-correct').click();
  const txtEvent = page.waitForEvent('download');
  await page.locator('#demo-export-txt').click();
  const txt = await txtEvent;
  const txtPath = await txt.path();
  expect(txtPath).not.toBeNull();
  const txtBody = await import('node:fs/promises').then(({ readFile }) => readFile(txtPath!, 'utf8'));
  expect(txtBody).toContain('[10:04:25] The address is 24 Moss Lane.');

  const csvEvent = page.waitForEvent('download');
  await page.locator('#demo-export-csv').click();
  const csv = await csvEvent;
  const csvPath = await csv.path();
  expect(csvPath).not.toBeNull();
  const csvBody = await import('node:fs/promises').then(({ readFile }) => readFile(csvPath!, 'utf8'));
  expect(csvBody.split('\n')).toHaveLength(4);
  expect(csvBody).toContain('timestamp,caption');
  expect(csvBody).toContain('"The address is 24 Moss Lane. I will bring the signed form."');
});

test('@claim:billing-status does not offer checkout before an exact offer is registered', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visual settings are not for sale yet' })).toBeVisible();
  await expect(page.getByText('Price: not set.')).toBeVisible();
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
  expect(requests.some(url => url.startsWith('https://api.sociobot.in/'))).toBe(false);
});

for (const route of ['/', '/demo/', '/privacy/', '/terms/', '/404.html']) {
  test(`has no serious accessibility violations on ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route(api, releaseRoute => releaseRoute.fulfill({ contentType: 'application/json', body: JSON.stringify(release) }));
    await page.goto(route);
    const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
    expect(await page.locator('h1').count()).toBe(1);
    expect(await page.locator('main').count()).toBe(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test('keeps keyboard focus visible and every visible button above 4.5:1 contrast', async ({ page }) => {
  await page.route(api, route => route.abort('failed'));
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const ratios = await page.locator('.button:visible').evaluateAll((buttons) => {
    const rgb = (value: string) => value.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number);
    const luminance = (value: number[]) => value.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    return buttons.map(button => {
      const style = getComputedStyle(button);
      const values = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))].sort((a, b) => b - a);
      return (values[0] + .05) / (values[1] + .05);
    });
  });
  expect(ratios.every(ratio => ratio >= 4.5)).toBe(true);
});

test('uses the mobile layout and touch-sized main actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' }));
  await page.route(api, route => route.abort('failed'));
  await page.goto('/');
  const box = await page.getByRole('link', { name: 'Try it with sample data' }).boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('h1').count()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.locator('#download-link')).toHaveText('View desktop downloads');
});

test('@claim:private-native-session waits for consent and selection, then captions locally without recording or network transfer', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    const state = {
      captures: [] as MediaStreamConstraints[],
      stopped: 0,
      recorders: 0,
      invokes: [] as { command: string; sampleCount: number }[],
      processor: null as ScriptProcessorNode | null,
    };
    Object.assign(window, { __pccTest: state });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      enumerateDevices: async () => [
        { kind: 'audioinput', deviceId: 'mic-private', label: 'USB headset microphone', groupId: 'one', toJSON() { return this; } },
        { kind: 'audiooutput', deviceId: 'speaker', label: 'Speakers', groupId: 'two', toJSON() { return this; } },
      ],
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        state.captures.push(constraints);
        return { getTracks: () => [{ stop: () => { state.stopped += 1; } }] };
      },
      addEventListener: () => undefined,
    } });
    class TestAudioContext {
      sampleRate = 48_000;
      destination = {};
      async resume() { return undefined; }
      async close() { return undefined; }
      createMediaStreamSource() { return { connect: () => undefined }; }
      createScriptProcessor() {
        const processor = { onaudioprocess: null, connect: () => undefined, disconnect: () => undefined } as unknown as ScriptProcessorNode;
        state.processor = processor;
        return processor;
      }
    }
    Object.assign(window, { AudioContext: TestAudioContext });
    Object.assign(window, { MediaRecorder: class { constructor() { state.recorders += 1; } } });
    let callback = 0;
    Object.assign(window, { __TAURI_INTERNALS__: {
      transformCallback: () => ++callback,
      unregisterCallback: () => undefined,
      invoke: async (command: string, args: { samples?: number[] }) => {
        state.invokes.push({ command, sampleCount: args?.samples?.length ?? 0 });
        if (command === 'transcribe_chunk') {
          await new Promise(resolve => setTimeout(resolve, 120));
          return 'Tuesday at two works for me.';
        }
        return null;
      },
    } });
  });
  await page.goto('http://127.0.0.1:4174/');
  const nativeA11y = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(nativeA11y.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await expect(page.locator('#microphone')).toContainText('USB headset microphone');
  expect(await page.evaluate(() => (window as unknown as { __pccTest: { captures: unknown[] } }).__pccTest.captures.length)).toBe(0);

  await page.locator('#start').click();
  await expect(page.locator('#status')).toContainText('Confirm the consent guidance');
  expect(await page.evaluate(() => (window as unknown as { __pccTest: { captures: unknown[] } }).__pccTest.captures.length)).toBe(0);

  await page.locator('#consent').check();
  await page.locator('#microphone').selectOption('mic-private');
  await page.locator('#model').fill('/models/tiny.en.bin');
  await page.locator('#start').click();
  const capture = await page.evaluate(() => (window as unknown as { __pccTest: { captures: MediaStreamConstraints[] } }).__pccTest.captures[0]);
  expect(capture).toMatchObject({ audio: { deviceId: { exact: 'mic-private' } }, video: false });

  const started = Date.now();
  await page.evaluate(async () => {
    const state = (window as unknown as { __pccTest: { processor: ScriptProcessorNode } }).__pccTest;
    const input = new Float32Array(4_096).fill(.1);
    const output = new Float32Array(4_096);
    for (let frame = 0; frame < 12; frame++) {
      state.processor.onaudioprocess?.({
        inputBuffer: { getChannelData: () => input },
        outputBuffer: { getChannelData: () => output },
      } as unknown as AudioProcessingEvent);
      await new Promise(resolve => setTimeout(resolve, 86));
    }
  });
  await expect(page.locator('#caption')).toHaveText('Tuesday at two works for me.');
  expect(Date.now() - started).toBeLessThan(2_000);
  page.once('dialog', dialog => dialog.accept('Tuesday at 2:00 works for me.'));
  await page.keyboard.press('Control+Shift+E');
  await expect(page.locator('#caption')).toHaveText('Tuesday at 2:00 works for me.');
  const csvEvent = page.waitForEvent('download');
  await page.locator('#export-csv').click();
  const csvPath = await (await csvEvent).path();
  expect(csvPath).not.toBeNull();
  const csvBody = await import('node:fs/promises').then(({ readFile }) => readFile(csvPath!, 'utf8'));
  expect(csvBody).toContain('Tuesday at 2:00 works for me.');
  await page.locator('#overlay').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __pccTest: { invokes: { command: string }[] } }).__pccTest.invokes.some(call => call.command === 'open_caption_window'))).toBe(true);
  const nativeState = await page.evaluate(() => {
    const { invokes, recorders } = (window as unknown as { __pccTest: { invokes: { command: string; sampleCount: number }[]; recorders: number } }).__pccTest;
    return { invokes, recorders };
  });
  expect(nativeState.invokes.some(call => call.command === 'transcribe_chunk' && call.sampleCount === 16_000)).toBe(true);
  expect(nativeState.invokes.some(call => call.command === 'open_caption_window')).toBe(true);
  expect(nativeState.recorders).toBe(0);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4174/'))).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage).every(key => !key.includes('caption')))).toBe(true);
});
