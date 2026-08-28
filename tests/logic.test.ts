import { describe, expect, it } from 'vitest';

function csv(text: string) { return `"${text.replaceAll('"', '""')}"`; }
function downsampleLength(inputLength: number, sourceRate: number) { return Math.floor(inputLength / (sourceRate / 16000)); }
describe('local caption data handling', () => {
  it('keeps CSV fields valid when a correction contains quotes', () => expect(csv('she said "yes"')).toBe('"she said ""yes"""'));
  it('reduces microphone samples to local Whisper’s 16 kHz input', () => expect(downsampleLength(48000, 48000)).toBe(16000));
});
