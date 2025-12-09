class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bitDepth = 16;
    this.mode = 'passthrough'; // 'passthrough', 'bitcrush', 'reverse'
    this.port.onmessage = (event) => {
      if (event.data.bitDepth !== undefined) {
        this.bitDepth = event.data.bitDepth;
      }
      if (event.data.mode !== undefined) {
        this.mode = event.data.mode;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input.length) return true;

    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel];
      const outputData = output[channel];

      if (this.mode === 'bitcrush' && this.bitDepth < 16) {
        // Apply bit crushing
        const step = Math.pow(2, 16 - this.bitDepth);
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = step * Math.floor(inputData[i] / step + 0.5);
        }
      } else {
        // Passthrough
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = inputData[i];
        }
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
