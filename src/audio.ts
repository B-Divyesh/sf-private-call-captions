export const CAPTION_SAMPLE_RATE = 16_000;
export const CAPTION_WINDOW_MS = 1_000;
export const CAPTION_WINDOW_SAMPLES = CAPTION_SAMPLE_RATE * CAPTION_WINDOW_MS / 1_000;

export function downsample(input: Float32Array, sourceRate: number) {
  const ratio = sourceRate / CAPTION_SAMPLE_RATE;
  const length = Math.floor(input.length / ratio);
  const output = new Array<number>(length);
  for (let index = 0; index < length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let sum = 0;
    for (let sample = start; sample < end; sample++) sum += input[sample];
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
}

export class CaptionChunker {
  private samples: number[] = [];

  push(input: Float32Array, sourceRate: number) {
    for (const sample of downsample(input, sourceRate)) this.samples.push(sample);
    const ready: number[][] = [];
    while (this.samples.length >= CAPTION_WINDOW_SAMPLES) {
      ready.push(this.samples.splice(0, CAPTION_WINDOW_SAMPLES));
    }
    return ready;
  }

  clear() {
    this.samples = [];
  }
}
