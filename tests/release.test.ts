import { describe, expect, it } from 'vitest';
import { RELEASE_API, RELEASE_CACHE_KEY, getLatestRelease, readRelease } from '../site/src/release';

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
});
