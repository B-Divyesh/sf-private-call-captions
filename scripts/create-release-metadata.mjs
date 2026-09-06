import { createHash } from 'node:crypto';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const INSTALLER_EXTENSIONS = /\.(?:dmg|msi|exe|AppImage|deb)$/i;

export function platformFiles(files) {
  const find = (pattern) => files.find((name) => pattern.test(name));
  return {
    'macos-arm64': find(/macos-arm64\.dmg$/i),
    'macos-x64': find(/macos-x64\.dmg$/i),
    windows: find(/windows\.msi$/i) ?? find(/windows\.exe$/i),
    linux: find(/linux\.AppImage$/i) ?? find(/linux\.deb$/i),
  };
}

export async function createReleaseMetadata(directory, tag, repository) {
  const files = (await readdir(directory)).filter((name) => INSTALLER_EXTENSIONS.test(name)).sort();
  if (files.some((name) => /\s/.test(name))) throw new Error('Installer asset names must not contain spaces.');
  const selected = platformFiles(files);
  const missing = Object.entries(selected).filter(([, name]) => !name).map(([platform]) => platform);
  if (missing.length) throw new Error(`Required installer assets are missing: ${missing.join(', ')}`);

  const checksumLines = [];
  for (const name of files) {
    const bytes = await readFile(join(directory, name));
    checksumLines.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  }
  const temporarySums = join(directory, '..', `.SHA256SUMS-${process.pid}`);
  await writeFile(temporarySums, `${checksumLines.join('\n')}\n`);
  await rename(temporarySums, join(directory, 'SHA256SUMS'));

  const base = `https://github.com/${repository}/releases/download/${tag}/`;
  const manifest = {
    version: tag.replace(/^v/, ''),
    platforms: Object.fromEntries(Object.entries(selected).map(([platform, name]) => [platform, {
      file: name,
      url: `${base}${encodeURIComponent(name)}`,
    }])),
  };
  await writeFile(join(directory, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, checksumLines };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [directory, tag, repository] = process.argv.slice(2);
  if (!directory || !tag || !repository) {
    throw new Error('Usage: create-release-metadata.mjs <directory> <tag> <owner/repository>');
  }
  await createReleaseMetadata(directory, tag, repository);
  process.stdout.write(`Created release metadata for ${basename(directory)}.\n`);
}
