import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RELEASE_API, RELEASE_CACHE_KEY, detectedPlatform, getLatestRelease, readRelease } from '../site/src/release';
import { createReleaseMetadata } from '../scripts/create-release-metadata.mjs';

const execFileAsync = promisify(execFile);

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const apiRelease = {
  tag_name: 'v0.1.4', html_url: 'https://github.com/B-Divyesh/sf-private-call-captions/releases/tag/v0.1.4', assets: [
    { name: 'Private.Call.Captions_0.1.4_aarch64.dmg', browser_download_url: 'https://github.com/download/arm.dmg' },
    { name: 'Private.Call.Captions_0.1.4_x64.dmg', browser_download_url: 'https://github.com/download/x64.dmg' },
    { name: 'Private.Call.Captions_0.1.4_x64_en-US.msi', browser_download_url: 'https://github.com/download/windows.msi' },
    { name: 'Private.Call.Captions_0.1.4_amd64.AppImage', browser_download_url: 'https://github.com/download/linux.AppImage' },
  ],
};

describe('GitHub release metadata', () => {
  it('maps GitHub API assets to the desktop installers', () => {
    expect(readRelease(apiRelease)).toMatchObject({ version: '0.1.4', platforms: {
      'macos-arm64': 'https://github.com/download/arm.dmg', 'macos-x64': 'https://github.com/download/x64.dmg', windows: 'https://github.com/download/windows.msi', linux: 'https://github.com/download/linux.AppImage',
    } });
  });

  it('uses the CORS-enabled GitHub API and caches a successful result for one hour', async () => {
    const storage = new MemoryStorage();
    const requested: string[] = [];
    const request = async (url: string | URL | Request) => {
      requested.push(String(url));
      return new Response(JSON.stringify(apiRelease), { status: 200 });
    };
    const first = await getLatestRelease(request as typeof fetch, storage as unknown as Storage, 1000);
    const second = await getLatestRelease(async () => { throw new Error('network should not be used while cached'); }, storage as unknown as Storage, 2000);
    expect(requested).toEqual([RELEASE_API]);
    expect(requested[0]).not.toContain('/releases/latest/download/latest.json');
    expect(first.source).toBe('api');
    expect(second.source).toBe('cache');
    expect(storage.getItem(RELEASE_CACHE_KEY)).toContain('0.1.4');
  });

  it('returns a calm empty result when GitHub is unavailable', async () => {
    const result = await getLatestRelease(async () => { throw new TypeError('Failed to fetch'); }, new MemoryStorage() as unknown as Storage, 1000);
    expect(result).toEqual({ release: null, source: 'none' });
  });

  it('does not offer a desktop installer directly to a phone', () => {
    expect(detectedPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile')).toBe('mobile');
    expect(detectedPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile')).toBe('mobile');
  });

  it('@claim:installer-integrity creates exact release URLs and installs a checksum-matched Linux artifact', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pcc-release-'));
    const installDirectory = join(directory, 'installed');
    const files = [
      'private-call-captions-0.1.5-macos-arm64.dmg',
      'private-call-captions-0.1.5-macos-x64.dmg',
      'private-call-captions-0.1.5-windows.msi',
      'private-call-captions-0.1.5-linux.AppImage',
      'private-call-captions-0.1.5-linux.deb',
    ];
    try {
      await Promise.all(files.map((name) => writeFile(join(directory, name), `installer:${name}`)));
      const { manifest, checksumLines } = await createReleaseMetadata(directory, 'v0.1.5', 'B-Divyesh/sf-private-call-captions');
      expect(manifest.platforms.linux.url.endsWith('/private-call-captions-0.1.5-linux.AppImage')).toBe(true);
      expect(manifest.platforms['macos-arm64'].url.endsWith('/private-call-captions-0.1.5-macos-arm64.dmg')).toBe(true);
      expect(checksumLines).toHaveLength(files.length);
      expect(checksumLines.every((line) => !line.includes('release/'))).toBe(true);

      const server = createServer(async (request, response) => {
        try {
          const name = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname.slice(1));
          response.end(await readFile(join(directory, name)));
        } catch { response.writeHead(404).end(); }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test release server did not start.');
      const base = `http://127.0.0.1:${address.port}`;
      try {
        const result = await execFileAsync('sh', ['public/install.sh'], { cwd: process.cwd(), env: {
          ...process.env,
          PCC_RELEASE_BASE: base,
          PCC_ASSET_BASE: base,
          PCC_INSTALL_DIR: installDirectory,
        } });
        expect(result.stdout).toContain('private-call-captions-0.1.5-linux.AppImage: OK');
        expect(result.stdout).toContain('Installed Private Call Captions');
        expect(await readFile(join(installDirectory, 'private-call-captions'), 'utf8')).toBe('installer:private-call-captions-0.1.5-linux.AppImage');
      } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
