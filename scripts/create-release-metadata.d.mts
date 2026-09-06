export function platformFiles(files: string[]): Record<'macos-arm64' | 'macos-x64' | 'windows' | 'linux', string | undefined>;
export function createReleaseMetadata(directory: string, tag: string, repository: string): Promise<{
  manifest: {
    version: string;
    platforms: Record<'macos-arm64' | 'macos-x64' | 'windows' | 'linux', { file: string; url: string }>;
  };
  checksumLines: string[];
}>;
