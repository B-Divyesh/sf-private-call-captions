export const RELEASE_API = 'https://api.github.com/repos/B-Divyesh/sf-private-call-captions/releases/latest';
export const RELEASE_CACHE_KEY = 'pcc:release-metadata:v1';
export const RELEASE_CACHE_MS = 60 * 60 * 1000;

export type Platform = 'macos-arm64' | 'macos-x64' | 'windows' | 'linux';
export type ReleaseAsset = { name: string; browser_download_url: string };
export type GitHubRelease = {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
};
export type DownloadRelease = {
  version: string;
  releaseUrl: string;
  platforms: Partial<Record<Platform, string>>;
};
type CachedRelease = { savedAt: number; release: DownloadRelease };

function findAsset(assets: ReleaseAsset[], expression: RegExp) {
  return assets.find(({ name }) => expression.test(name))?.browser_download_url;
}

export function readRelease(release: GitHubRelease): DownloadRelease | null {
  if (!release || !Array.isArray(release.assets) || typeof release.tag_name !== 'string' || typeof release.html_url !== 'string') return null;
  const assets = release.assets.filter((asset): asset is ReleaseAsset => typeof asset?.name === 'string' && typeof asset?.browser_download_url === 'string');
  const platforms: DownloadRelease['platforms'] = {
    'macos-arm64': findAsset(assets, /(?:aarch64|arm64).*\.dmg$/i),
    'macos-x64': findAsset(assets, /(?:x64|amd64).*\.dmg$/i),
    windows: findAsset(assets, /(?:x64|amd64).*(?:\.msi|\.exe)$/i) ?? findAsset(assets, /(?:\.msi|\.exe)$/i),
    linux: findAsset(assets, /\.appimage$/i) ?? findAsset(assets, /\.deb$/i),
  };
  return { version: release.tag_name.replace(/^v/, ''), releaseUrl: release.html_url, platforms };
}

function safeRead(storage: Storage, now: number) {
  try {
    const item = JSON.parse(storage.getItem(RELEASE_CACHE_KEY) ?? 'null') as CachedRelease | null;
    if (item && now - item.savedAt >= 0 && now - item.savedAt < RELEASE_CACHE_MS && item.release?.releaseUrl) return item.release;
  } catch { /* private browsing or malformed old cache: use the calm fallback */ }
  return null;
}

function safeWrite(storage: Storage, release: DownloadRelease, now: number) {
  try { storage.setItem(RELEASE_CACHE_KEY, JSON.stringify({ savedAt: now, release })); } catch { /* storage is an optional convenience */ }
}

export async function getLatestRelease(
  request: typeof fetch = fetch,
  storage: Storage = localStorage,
  now = Date.now(),
): Promise<{ release: DownloadRelease | null; source: 'api' | 'cache' | 'none' }> {
  const cached = safeRead(storage, now);
  if (cached) return { release: cached, source: 'cache' };
  try {
    const response = await request(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!response.ok) return { release: null, source: 'none' };
    const parsed = readRelease(await response.json() as GitHubRelease);
    if (!parsed) return { release: null, source: 'none' };
    safeWrite(storage, parsed, now);
    return { release: parsed, source: 'api' };
  } catch {
    return { release: null, source: 'none' };
  }
}

export function detectedPlatform(userAgent = navigator.userAgent) : Platform {
  const agent = userAgent.toLowerCase();
  if (agent.includes('win')) return 'windows';
  if (agent.includes('mac')) return /arm|aarch64/.test(agent) ? 'macos-arm64' : 'macos-x64';
  return 'linux';
}

export function platformLabel(platform: Platform) {
  return platform === 'windows' ? 'Windows' : platform === 'linux' ? 'Linux' : platform === 'macos-arm64' ? 'macOS (Apple silicon)' : 'macOS (Intel)';
}
