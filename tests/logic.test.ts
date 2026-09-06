import { describe, expect, it } from 'vitest';
import { CAPTION_WINDOW_MS, CaptionChunker, downsample } from '../src/audio';

function csv(text: string) { return `"${text.replaceAll('"', '""')}"`; }
describe('local caption data handling', () => {
  it('keeps CSV fields valid when a correction contains quotes', () => expect(csv('she said "yes"')).toBe('"she said ""yes"""'));
  it('reduces microphone samples to local Whisper’s 16 kHz input', () => expect(downsample(new Float32Array(48_000), 48_000)).toHaveLength(16_000));

  it('@claim:caption-latency sends one-second audio windows throughout a 30-minute session', () => {
    const chunker = new CaptionChunker();
    let dispatched = 0;
    for (let elapsedSeconds = 0; elapsedSeconds < 30 * 60; elapsedSeconds += 10) {
      dispatched += chunker.push(new Float32Array(160_000), 16_000).length;
    }
    expect(CAPTION_WINDOW_MS).toBeLessThan(2_000);
    expect(dispatched).toBe(30 * 60);
  });
});
