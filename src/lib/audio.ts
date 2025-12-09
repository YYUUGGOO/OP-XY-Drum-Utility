let audioCtx: AudioContext | null = null;

type ProcessSettings = {
  start: number;
  end: number;
  reverse: boolean;
  bitDepth: number;
  sampleRate: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('Audio context is only available in the browser');
  }
  if (!audioCtx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

export async function decodeFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  // slice to detach; decodeAudioData mutates the buffer
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

export function trimBuffer(buffer: AudioBuffer, startPercent: number, endPercent: number): AudioBuffer {
  const ctx = getAudioContext();
  const start = clamp01(startPercent);
  const end = clamp01(endPercent);
  const safeStart = Math.min(start, end);
  const safeEnd = Math.max(start, end);
  const length = buffer.length;
  const startSample = Math.floor(length * safeStart);
  const endSample = Math.floor(length * safeEnd);
  const newLength = Math.max(1, endSample - startSample);

  const trimmed = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = trimmed.getChannelData(c);
    for (let i = 0; i < newLength; i++) {
      dst[i] = src[startSample + i];
    }
  }
  return trimmed;
}

export function reverseBuffer(buffer: AudioBuffer): AudioBuffer {
  const ctx = getAudioContext();
  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = reversed.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      dst[i] = src[buffer.length - 1 - i];
    }
  }
  return reversed;
}

export function bitcrushBuffer(buffer: AudioBuffer, bitDepth: number): AudioBuffer {
  if (bitDepth >= 16) return buffer;
  const ctx = getAudioContext();
  const crushed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const levels = Math.pow(2, bitDepth);
  const step = 2 / levels;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = crushed.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, src[i]));
      dst[i] = step * Math.floor(sample / step + 0.5);
    }
  }
  return crushed;
}

export function resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
  const originalSampleRate = buffer.sampleRate;
  if (targetSampleRate >= originalSampleRate) return buffer;
  const ctx = getAudioContext();
  const ratio = targetSampleRate / originalSampleRate;
  const newLength = Math.floor(buffer.length * ratio);
  const resampled = ctx.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = resampled.getChannelData(c);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const floor = Math.floor(srcIndex);
      const ceil = Math.min(floor + 1, buffer.length - 1);
      const frac = srcIndex - floor;
      dst[i] = src[floor] * (1 - frac) + src[ceil] * frac;
    }
  }
  return resampled;
}

export function processBuffer(buffer: AudioBuffer, settings: ProcessSettings): AudioBuffer {
  let processed = buffer;
  const start = clamp01(settings.start);
  const end = clamp01(settings.end);
  if (start > 0 || end < 1) {
    processed = trimBuffer(processed, start, end);
  }
  if (settings.reverse) {
    processed = reverseBuffer(processed);
  }
  if (settings.bitDepth < 16) {
    processed = bitcrushBuffer(processed, settings.bitDepth);
  }
  if (settings.sampleRate < processed.sampleRate) {
    processed = resampleBuffer(processed, settings.sampleRate);
  }
  return processed;
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const numSamples = buffer.length;
  const blockAlign = numChannels * bytesPerSample;
  const totalSize = 44 + numSamples * blockAlign;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * blockAlign, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function playBuffer(buffer: AudioBuffer): () => void {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return () => source.stop();
}
