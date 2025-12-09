// Enhanced OP XY Drumkit Maker with sample editing (client-side)
// Supports: .preset folder export, sample trimming, reversal, bitcrushing, and interactive waveform editing

const MAX_SLOTS = 24;
const slotsEl = document.getElementById('slots');
const MAX_SLICES = MAX_SLOTS;
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentKitName = null;
let fileMap = new Map(); // relativePath -> File
let slotAssignments = Array(MAX_SLOTS).fill(null); // { file, filename, startPoint, endPoint, reverse, bitDepth, buffer, processedBuffer }
let audioWorkletNode = null;

const SLOT_LABELS = [
  "kick", "kick alt", "snare", "snare", "rim", "clap / snap",
  "tamp / perc", "shaker", "closed hi-hat", "closed hi-hat", "open hi-hat", "clave",
  "low tom", "ride", "mid tom", "crash", "hi tom", "triangle",
  "low congo", "high congo", "cowbell", "guiro", "metal", "chi"
];
const dropZone = document.getElementById('dropZone');
const kitNameEl = document.getElementById('kitName');
const openFolderBtn = document.getElementById('openFolder');
const dirPicker = document.getElementById('dirPicker');
const addFilesBtn = document.getElementById('addFiles');
const filePicker = document.getElementById('filePicker');
const clearAllBtn = document.getElementById('clearAll');
const exportBtn = document.getElementById('exportBtn');
const waveformEdit = document.getElementById('waveformEdit');
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx = waveCanvas ? waveCanvas.getContext('2d') : null;
const tabButtons = Array.from(document.querySelectorAll('.tabButton'));
const tabPanels = Array.from(document.querySelectorAll('.tabPanel'));
let activeTab = tabButtons.find(btn => btn.classList.contains('active'))?.dataset.tabTarget || 'slicing';
const sliceControlsEl = document.getElementById('sliceEditor');
const sliceStartInput = document.getElementById('sliceStart');
const sliceEndInput = document.getElementById('sliceEnd');
const sliceReverseCheckbox = document.getElementById('sliceReverse');
const sliceBitDepthSelect = document.getElementById('sliceBitDepth');
const sliceSampleRateSelect = document.getElementById('sliceSampleRate');
const sliceStartLabel = document.getElementById('sliceStartLabel');
const sliceEndLabel = document.getElementById('sliceEndLabel');
const sliceCountInput = document.getElementById('sliceCount');
const sliceCountLabel = document.getElementById('sliceCountLabel');
const sliceModeRadios = Array.from(document.querySelectorAll('input[name="sliceMode"]'));
const sliceTransientInput = document.getElementById('sliceTransientSensitivity');
const sliceTransientLabel = document.getElementById('sliceTransientLabel');
const sliceFileInput = document.getElementById('sliceFileInput');
const sliceUploadBtn = document.getElementById('sliceUploadBtn');
const sliceClearBtn = document.getElementById('sliceClearBtn');
const sliceDropZone = document.getElementById('sliceDropZone');
const sliceMetaEl = document.getElementById('sliceMeta');
const sliceListEl = document.getElementById('sliceList');
const sliceImportBtn = document.getElementById('sliceImportBtn');
const slicePreviewAllBtn = document.getElementById('slicePreviewAll');
const manualSliceEditor = document.getElementById('manualSliceEditor');
const manualSliceLabel = document.getElementById('manualSliceLabel');
const manualSliceStartInput = document.getElementById('manualSliceStart');
const manualSliceEndInput = document.getElementById('manualSliceEnd');
const manualSliceStartValue = document.getElementById('manualSliceStartValue');
const manualSliceEndValue = document.getElementById('manualSliceEndValue');
const manualSliceApplyBtn = document.getElementById('manualSliceApply');
const manualSliceSplitBtn = document.getElementById('manualSliceSplit');
const manualSliceDeleteBtn = document.getElementById('manualSliceDelete');
const slotEditorPanel = document.getElementById('slotEditorPanel');
const slotEditorTitle = document.getElementById('slotEditorTitle');
const slotEditorMeta = document.getElementById('slotEditorMeta');
const slotStartInput = document.getElementById('slotStart');
const slotEndInput = document.getElementById('slotEnd');
const slotStartLabel = document.getElementById('slotStartLabel');
const slotEndLabel = document.getElementById('slotEndLabel');
const slotReverseCheckbox = document.getElementById('slotReverse');
const slotBitDepthSelect = document.getElementById('slotBitDepth');
const slotSampleRateSelect = document.getElementById('slotSampleRate');
const slotEditorCloseBtn = document.getElementById('slotEditorClose');
const slotEditorPreviewBtn = document.getElementById('slotEditorPreview');
const slotEditorResetBtn = document.getElementById('slotEditorReset');
const sliceControlInputs = [
  sliceStartInput,
  sliceEndInput,
  sliceReverseCheckbox,
  sliceBitDepthSelect,
  sliceSampleRateSelect,
  sliceCountInput,
  sliceTransientInput,
  ...sliceModeRadios
].filter(Boolean);

const slicingState = {
  file: null,
  buffer: null,
  processedBuffer: null,
  baseName: 'loop',
  startPoint: 0,
  endPoint: 1,
  reverse: false,
  bitDepth: 16,
  sampleRate: 44100,
  sliceCount: 8,
  mode: 'equal',
  transientSensitivity: 0.5,
  slices: [],
  sliceSource: 'equal'
};

let manualSliceIndex = null;

let activeSlotEditorIndex = null;
let activePreview = null;

function getSensitivityLabel(value){
  if(value <= 0.33) return 'Low';
  if(value <= 0.66) return 'Medium';
  return 'High';
}

async function decodeAudioFileToBuffer(file){
  if(!file) throw new Error('No file provided for decoding');
  const arrayBuffer = await file.arrayBuffer();
  return decodeArrayBufferToBuffer(arrayBuffer, file?.name);
}

async function decodeArrayBufferToBuffer(arrayBuffer, label = 'buffer'){
  try {
    return await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch(err){
    console.warn(`decodeAudioData failed for ${label}, trying fallback`, err);
    const aiffBuffer = decodeAiffToAudioBuffer(arrayBuffer);
    if(aiffBuffer){
      console.info(`AIFF fallback succeeded for ${label}`);
      return aiffBuffer;
    }
    throw err;
  }
}

function decodeAiffToAudioBuffer(arrayBuffer){
  try {
    const view = new DataView(arrayBuffer);
    if(view.byteLength < 12) return null;
    if(readFourCC(view, 0) !== 'FORM') return null;
    const format = readFourCC(view, 8);
    if(format !== 'AIFF' && format !== 'AIFC') return null;

    let offset = 12;
    let numChannels = 0;
    let numFrames = 0;
    let bitDepth = 0;
    let sampleRate = 44100;
    let compression = 'NONE';
  let soundDataStart = null;
  let soundDataOffset = 0;

    while(offset + 8 <= view.byteLength){
      const chunkId = readFourCC(view, offset);
      const chunkSize = view.getUint32(offset + 4);
      const chunkStart = offset + 8;

      if(chunkId === 'COMM'){
        numChannels = view.getUint16(chunkStart);
        numFrames = view.getUint32(chunkStart + 2);
        bitDepth = view.getUint16(chunkStart + 6);
        sampleRate = readExtendedFloat80(view, chunkStart + 8) || sampleRate;
        if(format === 'AIFC' && chunkSize >= 22){
          compression = readFourCC(view, chunkStart + 18) || 'NONE';
        }
      } else if(chunkId === 'SSND'){
        soundDataOffset = view.getUint32(chunkStart);
        // block size unused but read for completeness
        view.getUint32(chunkStart + 4);
        soundDataStart = chunkStart + 8 + soundDataOffset;
      }

      const padded = chunkSize + (chunkSize % 2);
      offset = chunkStart + padded;
    }

  if(!numChannels || !numFrames || !bitDepth || soundDataStart === null) return null;
    if(bitDepth > 32) return null; // unsupported depth
    if(compression !== 'NONE' && compression !== 'sowt') return null;

    const bytesPerSample = Math.max(1, Math.ceil(bitDepth / 8));
    const totalSamples = numFrames * numChannels;
    const totalBytesNeeded = totalSamples * bytesPerSample;
    if(soundDataStart + totalBytesNeeded > view.byteLength) return null;

    const bufferSampleRate = sanitizeSampleRate(sampleRate);
    const audioBuffer = audioCtx.createBuffer(numChannels, numFrames, bufferSampleRate);
    const littleEndian = compression === 'sowt';

    for(let channel = 0; channel < numChannels; channel++){
      const channelData = audioBuffer.getChannelData(channel);
      for(let frame = 0; frame < numFrames; frame++){
        const sampleIndex = frame * numChannels + channel;
        const byteOffset = soundDataStart + sampleIndex * bytesPerSample;
        const sampleValue = readAiffSample(view, byteOffset, bytesPerSample, bitDepth, littleEndian);
        channelData[frame] = sampleValue;
      }
    }

    return audioBuffer;
  } catch(err){
    console.warn('AIFF fallback decode failed', err);
    return null;
  }
}

function readFourCC(view, offset){
  if(offset + 4 > view.byteLength) return '';
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function readExtendedFloat80(view, offset){
  if(offset + 10 > view.byteLength) return 0;
  const expon = view.getUint16(offset);
  const hi = view.getUint32(offset + 2);
  const lo = view.getUint32(offset + 6);
  if(expon === 0 && hi === 0 && lo === 0) return 0;
  const sign = (expon & 0x8000) ? -1 : 1;
  const exp = (expon & 0x7FFF) - 16383;
  let value = hi * Math.pow(2, exp - 31);
  value += lo * Math.pow(2, exp - 63);
  return sign * value;
}

function readAiffSample(view, offset, bytesPerSample, bitDepth, littleEndian){
  const maxInt = Math.pow(2, bitDepth - 1);
  let sample = 0;
  switch(bytesPerSample){
    case 1:
      sample = view.getInt8(offset) / 128;
      break;
    case 2:
      sample = view.getInt16(offset, littleEndian) / 32768;
      break;
    case 3:
      sample = readInt24(view, offset, littleEndian) / 8388608;
      break;
    case 4:
      sample = view.getInt32(offset, littleEndian) / 2147483648;
      break;
    default:
      sample = view.getInt16(offset, littleEndian) / 32768;
  }
  if(!Number.isFinite(sample)) return 0;
  if(bytesPerSample === 1 || bytesPerSample === 2 || bytesPerSample === 3 || bytesPerSample === 4){
    return sample;
  }
  return Math.max(-1, Math.min(1, sample / maxInt));
}

function readInt24(view, offset, littleEndian){
  let value;
  if(littleEndian){
    value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
  } else {
    value = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
  }
  if(value & 0x800000) value |= 0xFF000000;
  return value;
}

function sanitizeSampleRate(rate){
  if(!Number.isFinite(rate) || rate <= 0) return 44100;
  return Math.min(192000, Math.max(8000, rate));
}

function switchTab(target){
  if(!target || activeTab === target) {
    // Ensure DOM reflects initial state at least once
    target = target || activeTab;
  }
  activeTab = target;

  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tabTarget === target;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach(panel => {
    const isActive = panel.dataset.tab === target;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tabTarget));
});

// Initialize tabs so hidden attribute matches the starting state
switchTab(activeTab);

function setSliceControlsEnabled(enabled){
  sliceControlInputs.forEach(input => {
    input.disabled = !enabled;
  });

  if(sliceControlsEl){
    if(enabled) sliceControlsEl.removeAttribute('aria-disabled');
    else sliceControlsEl.setAttribute('aria-disabled', 'true');
  }

  if(waveformEdit){
    waveformEdit.classList.toggle('visible', enabled && !!slicingState.processedBuffer);
  }

  if(sliceImportBtn) sliceImportBtn.disabled = !enabled || !slicingState.slices.length;
  if(slicePreviewAllBtn) slicePreviewAllBtn.disabled = !enabled || !slicingState.processedBuffer;
  if(sliceClearBtn) sliceClearBtn.disabled = !enabled;
}

function clearWaveform(){
  if(!waveCtx || !waveCanvas) return;
  waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
}
function syncSliceControlsFromState(){
  if(sliceStartInput){
    const startPercent = Math.round((slicingState.startPoint ?? 0) * 100);
    sliceStartInput.value = startPercent;
    if(sliceStartLabel) sliceStartLabel.textContent = startPercent + '%';
  }

  if(sliceEndInput){
    const endPercent = Math.round((slicingState.endPoint ?? 1) * 100);
    sliceEndInput.value = endPercent;
    if(sliceEndLabel) sliceEndLabel.textContent = endPercent + '%';
  }

  if(sliceReverseCheckbox){
    sliceReverseCheckbox.checked = !!slicingState.reverse;
  }

  if(sliceBitDepthSelect){
    sliceBitDepthSelect.value = String(slicingState.bitDepth || 16);
  }

  if(sliceSampleRateSelect){
    sliceSampleRateSelect.value = String(slicingState.sampleRate || 44100);
  }

  if(sliceCountInput){
    sliceCountInput.value = slicingState.sliceCount;
    sliceCountInput.disabled = slicingState.mode !== 'equal';
  }
  if(sliceCountLabel){
    if(slicingState.mode === 'equal'){
      const count = slicingState.sliceCount;
      sliceCountLabel.textContent = `${count} ${count === 1 ? 'slice' : 'slices'}`;
    } else {
      const detected = slicingState.slices.length;
      sliceCountLabel.textContent = detected ? `${detected} detected` : 'Auto (transients)';
    }
  }

  if(sliceModeRadios.length){
    sliceModeRadios.forEach(radio => {
      radio.checked = radio.value === slicingState.mode;
    });
  }

  if(sliceTransientInput){
    sliceTransientInput.value = Math.round((slicingState.transientSensitivity ?? 0.5) * 100);
  }
  if(sliceTransientLabel){
    sliceTransientLabel.textContent = getSensitivityLabel(slicingState.transientSensitivity ?? 0.5);
  }
}

function updateSliceMeta(){
  if(!sliceMetaEl) return;
  if(!slicingState.buffer){
    sliceMetaEl.textContent = '(no loop loaded)';
    return;
  }
  const seconds = (slicingState.buffer.length / slicingState.buffer.sampleRate);
  const durationLabel = seconds >= 10 ? seconds.toFixed(1) : seconds.toFixed(2);
  const sliceCount = slicingState.slices.length;
  const sourceLabel = slicingState.sliceSource === 'transient' ? 'transient' : slicingState.sliceSource === 'custom' ? 'custom' : 'grid';
  sliceMetaEl.textContent = `${slicingState.baseName} • ${durationLabel}s • ${slicingState.buffer.sampleRate}Hz • ${sliceCount} slice${sliceCount === 1 ? '' : 's'} (${sourceLabel})`;
}

function resetSlicingWorkspace(){
  slicingState.file = null;
  slicingState.buffer = null;
  slicingState.processedBuffer = null;
  slicingState.baseName = 'loop';
  slicingState.startPoint = 0;
  slicingState.endPoint = 1;
  slicingState.reverse = false;
  slicingState.bitDepth = 16;
  slicingState.sampleRate = 44100;
  slicingState.sliceCount = 8;
  slicingState.mode = 'equal';
  slicingState.transientSensitivity = 0.5;
  slicingState.slices = [];
  slicingState.sliceSource = 'equal';
  manualSliceIndex = null;
  syncSliceControlsFromState();
  updateSliceMeta();
  renderSliceList();
  clearWaveform();
  setSliceControlsEnabled(false);
}

async function handleLoopFile(file){
  if(!file) return;
  try {
    const decoded = await decodeAudioFileToBuffer(file);
    slicingState.file = file;
    slicingState.buffer = decoded;
    slicingState.baseName = (file.name.replace(/\.[^.]+$/, '') || 'loop').replace(/\s+/g, '_');
    updateSliceMeta();
    syncSliceControlsFromState();
    updateProcessedLoop();
  } catch(err) {
    console.error('Failed to decode loop for slicing:', err);
    try {
      alert('Unable to decode this audio file. Please use WAV/AIFF/MP3 or another compatible format.');
    } catch(alertErr){
      console.warn('Alert failed', alertErr);
    }
  }
}

function updateProcessedLoop(){
  if(!slicingState.buffer){
    slicingState.processedBuffer = null;
    slicingState.slices = [];
    renderSliceList();
    clearWaveform();
    setSliceControlsEnabled(false);
    return;
  }

  slicingState.processedBuffer = processAudioBuffer(slicingState.buffer, slicingState);
  updateSlices();
}

function updateSlices(){
  const buffer = slicingState.processedBuffer;
  if(!buffer){
    slicingState.slices = [];
    renderSliceList();
    clearWaveform();
    updateSliceMeta();
    setSliceControlsEnabled(false);
    return;
  }

  let slices = [];
  if(slicingState.mode === 'custom'){
    if(slicingState.slices.length){
      slices = slicingState.slices.map((s, idx) => {
        const startSample = Math.max(0, Math.min(buffer.length - 1, s.startSample));
        const endSample = Math.max(startSample + 1, Math.min(buffer.length, s.endSample));
        const durationMs = ((endSample - startSample) / buffer.sampleRate) * 1000;
        return { index: idx, startSample, endSample, durationMs };
      });
    } else {
      const count = slicingState.sliceCount || 1;
      slices = buildEqualSlices(buffer, count);
    }
    slicingState.sliceSource = 'custom';
  } else if(slicingState.mode === 'transient'){
    const sensitivity = slicingState.transientSensitivity ?? 0.5;
    slices = detectTransientSlices(buffer, sensitivity);
    if(slices.length >= 2){
      slicingState.sliceSource = 'transient';
    } else {
      const fallbackCount = slicingState.sliceCount || 8;
      slices = buildEqualSlices(buffer, fallbackCount);
      slicingState.sliceCount = slices.length;
      slicingState.sliceSource = 'grid';
    }
  } else {
    let count = parseInt(slicingState.sliceCount, 10);
    if(isNaN(count) || count < 1) count = 1;
    if(count > MAX_SLICES) count = MAX_SLICES;
    slices = buildEqualSlices(buffer, count);
    slicingState.sliceCount = slices.length;
    slicingState.sliceSource = 'grid';
  }

  slicingState.slices = slices;
  if(manualSliceIndex != null){
    const stillExists = slicingState.slices.some(s => s.index === manualSliceIndex);
    if(!stillExists) manualSliceIndex = null;
  }
  setSliceControlsEnabled(true);
  syncSliceControlsFromState();
  updateSlicingWaveform();
  renderSliceList();
  updateSliceMeta();
  if(manualSliceIndex != null) setManualSliceSelection(manualSliceIndex);
}

function buildEqualSlices(buffer, count){
  const totalLength = buffer.length;
  const safeCount = Math.min(Math.max(parseInt(count, 10) || 1, 1), MAX_SLICES);
  const step = totalLength / safeCount;
  return Array.from({ length: safeCount }, (_, idx) => {
    const startSample = Math.floor(idx * step);
    const endSample = idx === safeCount - 1 ? totalLength : Math.floor((idx + 1) * step);
    const durationMs = ((endSample - startSample) / buffer.sampleRate) * 1000;
    return { index: idx, startSample, endSample, durationMs };
  });
}

function detectTransientSlices(buffer, sensitivity = 0.5){
  const length = buffer.length;
  if(!length) return [];
  const maxSlices = MAX_SLICES;
  const channels = buffer.numberOfChannels;
  const hop = Math.max(256, Math.floor(buffer.sampleRate * 0.0025));
  const minSpacing = Math.max(hop, Math.floor(buffer.sampleRate * (0.02 + (1 - sensitivity) * 0.05)));
  const channelData = Array.from({ length: channels }, (_, idx) => buffer.getChannelData(idx));
  const magnitudes = [];

  for(let start = 0; start < length; start += hop){
    const end = Math.min(length, start + hop);
    let peak = 0;
    for(let c = 0; c < channels; c++){
      const data = channelData[c];
      for(let i = start; i < end; i++){
        const abs = Math.abs(data[i]);
        if(abs > peak) peak = abs;
      }
    }
    magnitudes.push(peak / channels);
  }

  const maxMag = Math.max(...magnitudes);
  if(!maxMag || !isFinite(maxMag)) return [];
  const normalized = magnitudes.map(v => v / maxMag);
  const smoothed = normalized.map((v, i) => {
    const prev = normalized[i-1] ?? v;
    const next = normalized[i+1] ?? v;
    return (prev + v + next) / 3;
  });

  const sorted = [...smoothed].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
  const deviations = smoothed.map(v => Math.abs(v - median)).sort((a,b)=>a-b);
  const mad = deviations.length ? deviations[Math.floor(deviations.length / 2)] : 0;
  const adaptiveBase = median + mad * 1.5;
  const threshold = Math.min(0.95, Math.max(0.05, adaptiveBase + (1 - sensitivity) * 0.15));
  const hysteresis = threshold * 0.85;
  const internalBoundaries = [];
  let lastBoundary = 0;

  for(let i = 1; i < smoothed.length - 1; i++){
    const value = smoothed[i];
    if(value < threshold) continue;
    const prev = smoothed[i-1];
    const next = smoothed[i+1];
    if(value < prev && value < next) continue;
    if(value - Math.max(prev, next) < hysteresis * 0.25) continue;
    const sampleIndex = Math.floor(i * hop);
    if(sampleIndex - lastBoundary < minSpacing) continue;
    internalBoundaries.push(sampleIndex);
    lastBoundary = sampleIndex;
    if(internalBoundaries.length >= maxSlices - 1) break;
  }

  const boundaries = [0, ...internalBoundaries, length];
  if(boundaries.length < 2) return [];
  const slices = [];
  for(let i = 0; i < boundaries.length - 1; i++){
    const startSample = boundaries[i];
    const endSample = boundaries[i + 1];
    const durationMs = ((endSample - startSample) / buffer.sampleRate) * 1000;
    slices.push({ index: i, startSample, endSample, durationMs });
    if(slices.length >= maxSlices) break;
  }
  return slices;
}

function updateSlicingWaveform(){
  if(!slicingState.processedBuffer){
    clearWaveform();
    return;
  }
  drawWaveform(slicingState.processedBuffer, 0, 1);
  if(!waveCtx || !waveCanvas) return;
  const w = waveCanvas.width;
  const h = waveCanvas.height;
  waveCtx.save();
  waveCtx.strokeStyle = 'rgba(224,85,38,0.6)';
  waveCtx.lineWidth = Math.max(1, (window.devicePixelRatio || 1));
  slicingState.slices.slice(1).forEach(slice => {
    const pct = slice.startSample / slicingState.processedBuffer.length;
    const x = pct * w;
    waveCtx.beginPath();
    waveCtx.moveTo(x, 0);
    waveCtx.lineTo(x, h);
    waveCtx.stroke();
  });
  waveCtx.restore();
}

function renderSliceList(){
  if(!sliceListEl) return;
  sliceListEl.innerHTML = '';
  if(!slicingState.slices.length){
    clearManualSliceSelection();
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = slicingState.buffer ? 'Adjust the slicing mode, sensitivity, or slice count to update slices.' : 'Load a loop to see individual slices.';
    sliceListEl.appendChild(li);
    return;
  }

  const frag = document.createDocumentFragment();
  slicingState.slices.forEach(slice => {
    const li = document.createElement('li');
    if(manualSliceIndex === slice.index) li.classList.add('selected');
    li.innerHTML = `
      <div class="sliceInfo">
        <strong>Slice ${slice.index + 1}</strong>
        <span>${slice.durationMs.toFixed(1)} ms</span>
      </div>
      <button class="slicePlay" type="button" data-slice-play="${slice.index}" aria-pressed="false">▶</button>
    `;
    li.dataset.sliceIndex = slice.index;
    frag.appendChild(li);
  });

  sliceListEl.appendChild(frag);

  if(activePreview && activePreview.kind === 'slice'){
    setSliceButtonPlaying(activePreview.id, true);
  }
}

function clearManualSliceSelection(){
  manualSliceIndex = null;
  if(manualSliceEditor) manualSliceEditor.hidden = true;
  if(sliceListEl){
    sliceListEl.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
  }
}

function setManualSliceSelection(index){
  if(!slicingState.slices.length || index == null){
    clearManualSliceSelection();
    return;
  }
  const slice = slicingState.slices.find(s => s.index === index);
  if(!slice){
    clearManualSliceSelection();
    return;
  }
  manualSliceIndex = index;
  if(manualSliceEditor) manualSliceEditor.hidden = false;
  if(manualSliceLabel) manualSliceLabel.textContent = `Slice ${slice.index + 1}`;

  const len = slicingState.processedBuffer?.length || 1;
  const startPct = Math.round((slice.startSample / len) * 1000) / 10;
  const endPct = Math.round((slice.endSample / len) * 1000) / 10;
  if(manualSliceStartInput){
    manualSliceStartInput.value = startPct;
    if(manualSliceStartValue) manualSliceStartValue.textContent = `${startPct}%`;
  }
  if(manualSliceEndInput){
    manualSliceEndInput.value = endPct;
    if(manualSliceEndValue) manualSliceEndValue.textContent = `${endPct}%`;
  }

  if(sliceListEl){
    sliceListEl.querySelectorAll('li').forEach(li => {
      li.classList.toggle('selected', Number(li.dataset.sliceIndex) === index);
    });
  }
}

function applyManualSliceEdit(){
  if(manualSliceIndex == null || !slicingState.processedBuffer) return;
  const slice = slicingState.slices.find(s => s.index === manualSliceIndex);
  if(!slice) return;

  if(slicingState.mode !== 'custom'){
    slicingState.mode = 'custom';
    slicingState.sliceSource = 'custom';
    syncSliceControlsFromState();
  }

  const len = slicingState.processedBuffer.length;
  let startPct = parseFloat(manualSliceStartInput?.value ?? '0') / 100;
  let endPct = parseFloat(manualSliceEndInput?.value ?? '1') / 100;
  if(!Number.isFinite(startPct)) startPct = 0;
  if(!Number.isFinite(endPct)) endPct = 1;
  startPct = Math.max(0, Math.min(1, startPct));
  endPct = Math.max(startPct, Math.min(1, endPct));

  const prevEnd = manualSliceIndex === 0 ? 0 : slicingState.slices[manualSliceIndex - 1]?.endSample ?? 0;
  const nextStart = manualSliceIndex === slicingState.slices.length - 1 ? len : slicingState.slices[manualSliceIndex + 1]?.startSample ?? len;
  const startSample = Math.max(prevEnd, Math.floor(startPct * len));
  const endSample = Math.max(startSample + 1, Math.min(nextStart, Math.floor(endPct * len)));

  slice.startSample = startSample;
  slice.endSample = endSample;
  slice.durationMs = ((endSample - startSample) / slicingState.processedBuffer.sampleRate) * 1000;

  slicingState.slices.sort((a,b)=> a.startSample - b.startSample).forEach((s, idx)=> s.index = idx);
  manualSliceIndex = slicingState.slices.findIndex(s => s === slice);

  updateSlicingWaveform();
  renderSliceList();
  updateSliceMeta();
  setManualSliceSelection(slice.index);
}

function splitManualSlice(){
  if(manualSliceIndex == null || !slicingState.processedBuffer) return;
  const slice = slicingState.slices.find(s => s.index === manualSliceIndex);
  if(!slice) return;

  const len = slicingState.processedBuffer.length;
  const midpoint = Math.floor((slice.startSample + slice.endSample) / 2);
  if(midpoint <= slice.startSample + 1 || midpoint >= slice.endSample - 1) return; // too small to split

  const newSlice = {
    index: slice.index + 1,
    startSample: midpoint,
    endSample: slice.endSample,
    durationMs: ((slice.endSample - midpoint) / slicingState.processedBuffer.sampleRate) * 1000
  };

  slice.endSample = midpoint;
  slice.durationMs = ((midpoint - slice.startSample) / slicingState.processedBuffer.sampleRate) * 1000;

  slicingState.slices.splice(slice.index + 1, 0, newSlice);
  slicingState.slices.sort((a,b)=> a.startSample - b.startSample).forEach((s, idx)=> s.index = idx);
  slicingState.mode = 'custom';
  slicingState.sliceSource = 'custom';
  syncSliceControlsFromState();
  updateSlicingWaveform();
  renderSliceList();
  updateSliceMeta();
  setManualSliceSelection(newSlice.index);
}

function deleteManualSlice(){
  if(manualSliceIndex == null || !slicingState.processedBuffer) return;
  if(slicingState.slices.length <= 1) return;
  const sliceIdx = slicingState.slices.findIndex(s => s.index === manualSliceIndex);
  if(sliceIdx === -1) return;

  const removed = slicingState.slices[sliceIdx];
  const prev = slicingState.slices[sliceIdx - 1];
  const next = slicingState.slices[sliceIdx + 1];

  if(prev){
    prev.endSample = removed.endSample;
    prev.durationMs = ((prev.endSample - prev.startSample) / slicingState.processedBuffer.sampleRate) * 1000;
  } else if(next){
    next.startSample = removed.startSample;
    next.durationMs = ((next.endSample - next.startSample) / slicingState.processedBuffer.sampleRate) * 1000;
  }

  slicingState.slices.splice(sliceIdx, 1);
  slicingState.slices.sort((a,b)=> a.startSample - b.startSample).forEach((s, idx)=> s.index = idx);

  slicingState.mode = 'custom';
  slicingState.sliceSource = 'custom';
  const nextIndex = Math.min(sliceIdx, slicingState.slices.length - 1);
  syncSliceControlsFromState();
  updateSlicingWaveform();
  renderSliceList();
  updateSliceMeta();
  setManualSliceSelection(slicingState.slices[nextIndex]?.index ?? null);
}

function setSliceButtonPlaying(index, playing){
  if(!sliceListEl) return;
  const btn = sliceListEl.querySelector(`[data-slice-play="${index}"]`);
  if(!btn) return;
  btn.classList.toggle('playing', playing);
  btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function isPreviewing(kind, id){
  return !!(activePreview && activePreview.kind === kind && activePreview.id === id);
}

function stopActivePreview(){
  if(!activePreview) return;
  const { source, cleanup } = activePreview;
  activePreview = null;
  if(source){
    try {
      source.onended = null;
      source.stop();
    } catch(err){
      console.warn('Failed to stop preview', err);
    }
  }
  if(typeof cleanup === 'function') cleanup();
}

function setActivePreview(kind, id, source, cleanup){
  stopActivePreview();
  activePreview = { kind, id, source, cleanup };
  source.onended = () => {
    if(activePreview && activePreview.source === source){
      const fn = activePreview.cleanup;
      activePreview = null;
      if(typeof fn === 'function') fn();
    }
  };
  source.start();
}

function previewBuffer(buffer, meta = {}){
  if(!buffer) return;
  if(meta.kind && isPreviewing(meta.kind, meta.id)){
    stopActivePreview();
    return;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  if(typeof meta.onStart === 'function') meta.onStart();
  setActivePreview(meta.kind || 'buffer', meta.id ?? null, source, meta.onStop);
}

function extractSliceBuffer(slice){
  if(!slicingState.processedBuffer) return null;
  const buffer = slicingState.processedBuffer;
  const startSample = Math.max(0, slice.startSample);
  const endSample = Math.min(buffer.length, slice.endSample);
  const length = Math.max(1, endSample - startSample);
  const out = audioCtx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for(let c = 0; c < buffer.numberOfChannels; c++){
    const source = buffer.getChannelData(c).subarray(startSample, endSample);
    out.getChannelData(c).set(source, 0);
  }
  return out;
}

function previewSlice(index){
  if(isPreviewing('slice', index)){
    stopActivePreview();
    return;
  }
  const slice = slicingState.slices[index];
  if(!slice) return;
  const sliceBuffer = extractSliceBuffer(slice);
  if(!sliceBuffer) return;
  previewBuffer(sliceBuffer, {
    kind: 'slice',
    id: index,
    onStart: () => setSliceButtonPlaying(index, true),
    onStop: () => setSliceButtonPlaying(index, false)
  });
}

async function importSlicesToDrumMaker(){
  if(!slicingState.slices.length) return;
  const emptySlots = [];
  for(let i = 0; i < MAX_SLOTS; i++){
    if(!slotAssignments[i]) emptySlots.push(i);
  }
  if(!emptySlots.length){
    try {
      alert('No empty slots available in the Drum Maker. Clear some slots and try again.');
    } catch (err) {
      console.warn('No empty slots for import');
    }
    return;
  }

  const baseName = (slicingState.baseName || 'slice').replace(/[^a-zA-Z0-9_-]/g,'_');
  const available = Math.min(emptySlots.length, slicingState.slices.length);
  for(let i = 0; i < available; i++){
    const sliceBuffer = extractSliceBuffer(slicingState.slices[i]);
    if(!sliceBuffer) continue;
    const wavBlob = encodeWAV(sliceBuffer);
    const fileName = `${baseName}_${String(i+1).padStart(2,'0')}.wav`;
    const file = new File([wavBlob], fileName, { type: 'audio/wav' });
    await assignFileToSlot(emptySlots[i], file);
  }

  switchTab('drum');
}

function handleSliceStartInput(){
  if(!sliceStartInput || !sliceEndInput) return;
  let startVal = parseFloat(sliceStartInput.value);
  let endVal = parseFloat(sliceEndInput.value);
  if(isNaN(startVal)) startVal = 0;
  if(isNaN(endVal)) endVal = 100;
  if(startVal > endVal){
    endVal = startVal;
    sliceEndInput.value = endVal;
    if(sliceEndLabel) sliceEndLabel.textContent = Math.round(endVal) + '%';
  }
  slicingState.startPoint = startVal / 100;
  slicingState.endPoint = endVal / 100;
  if(sliceStartLabel) sliceStartLabel.textContent = Math.round(startVal) + '%';
  updateProcessedLoop();
}

function handleSliceEndInput(){
  if(!sliceStartInput || !sliceEndInput) return;
  let endVal = parseFloat(sliceEndInput.value);
  let startVal = parseFloat(sliceStartInput.value);
  if(isNaN(endVal)) endVal = 100;
  if(isNaN(startVal)) startVal = 0;
  if(endVal < startVal){
    startVal = endVal;
    sliceStartInput.value = startVal;
    if(sliceStartLabel) sliceStartLabel.textContent = Math.round(startVal) + '%';
  }
  slicingState.startPoint = startVal / 100;
  slicingState.endPoint = endVal / 100;
  if(sliceEndLabel) sliceEndLabel.textContent = Math.round(endVal) + '%';
  updateProcessedLoop();
}

function handleSliceReverseChange(){
  if(!sliceReverseCheckbox) return;
  slicingState.reverse = sliceReverseCheckbox.checked;
  updateProcessedLoop();
}

function handleSliceBitDepthChange(){
  if(!sliceBitDepthSelect) return;
  slicingState.bitDepth = parseInt(sliceBitDepthSelect.value, 10) || 16;
  updateProcessedLoop();
}

function handleSliceSampleRateChange(){
  if(!sliceSampleRateSelect) return;
  slicingState.sampleRate = parseInt(sliceSampleRateSelect.value, 10) || 44100;
  updateProcessedLoop();
}

function handleSliceCountChange(){
  if(!sliceCountInput) return;
  let next = parseInt(sliceCountInput.value, 10);
  if(isNaN(next) || next < 1) next = 1;
  if(next > MAX_SLICES) next = MAX_SLICES;
  slicingState.sliceCount = next;
  syncSliceControlsFromState();
  if(slicingState.mode === 'equal'){
    updateSlices();
  }
}

function handleSliceModeChange(event){
  const value = event.target?.value;
  const nextMode = value === 'transient' ? 'transient' : value === 'custom' ? 'custom' : 'equal';
  if(slicingState.mode === nextMode) return;
  slicingState.mode = nextMode;
  if(nextMode === 'custom'){
    slicingState.sliceSource = 'custom';
  }
  syncSliceControlsFromState();
  updateSlices();
}

function handleTransientSensitivityChange(){
  if(!sliceTransientInput) return;
  const rawValue = parseInt(sliceTransientInput.value, 10);
  const normalized = Math.min(1, Math.max(0, (rawValue || 0) / 100));
  slicingState.transientSensitivity = normalized;
  if(sliceTransientLabel) sliceTransientLabel.textContent = getSensitivityLabel(normalized);
  if(slicingState.mode === 'transient'){
    updateSlices();
  }
}

if(sliceStartInput) sliceStartInput.addEventListener('input', handleSliceStartInput);
if(sliceEndInput) sliceEndInput.addEventListener('input', handleSliceEndInput);
if(sliceReverseCheckbox) sliceReverseCheckbox.addEventListener('change', handleSliceReverseChange);
if(sliceBitDepthSelect) sliceBitDepthSelect.addEventListener('change', handleSliceBitDepthChange);
if(sliceSampleRateSelect) sliceSampleRateSelect.addEventListener('change', handleSliceSampleRateChange);
if(sliceCountInput) sliceCountInput.addEventListener('input', handleSliceCountChange);
if(sliceModeRadios.length) sliceModeRadios.forEach(radio => radio.addEventListener('change', handleSliceModeChange));
if(sliceTransientInput) sliceTransientInput.addEventListener('input', handleTransientSensitivityChange);

if(sliceUploadBtn && sliceFileInput){
  sliceUploadBtn.addEventListener('click', ()=> sliceFileInput.click());
  sliceFileInput.addEventListener('change', e=>{
    const file = e.target.files && e.target.files[0];
    if(file) handleLoopFile(file);
    sliceFileInput.value = '';
  });
}

if(sliceClearBtn){
  sliceClearBtn.addEventListener('click', ()=>{
    resetSlicingWorkspace();
  });
}

if(sliceDropZone){
  const enter = e=>{ e.preventDefault(); sliceDropZone.classList.add('dragover'); };
  const leave = e=>{ e.preventDefault(); sliceDropZone.classList.remove('dragover'); };
  ['dragenter','dragover'].forEach(ev=> sliceDropZone.addEventListener(ev, enter));
  ['dragleave','drop'].forEach(ev=> sliceDropZone.addEventListener(ev, leave));
  sliceDropZone.addEventListener('drop', e=>{
    const file = e.dataTransfer?.files?.[0];
    if(file) handleLoopFile(file);
  });
  sliceDropZone.addEventListener('click', ()=> sliceFileInput?.click());
  sliceDropZone.addEventListener('keydown', e=>{
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      sliceFileInput?.click();
    }
  });
}

if(slicePreviewAllBtn){
  slicePreviewAllBtn.addEventListener('click', ()=>{
    if(isPreviewing('slice-all', 'loop')){
      stopActivePreview();
      return;
    }
    previewBuffer(slicingState.processedBuffer, {
      kind: 'slice-all',
      id: 'loop',
      onStart: () => slicePreviewAllBtn.classList.add('playing'),
      onStop: () => slicePreviewAllBtn.classList.remove('playing')
    });
  });
}

if(sliceImportBtn){
  sliceImportBtn.addEventListener('click', importSlicesToDrumMaker);
}

if(clearAllBtn){
  clearAllBtn.addEventListener('click', clearAllSlots);
}

if(manualSliceStartInput){
  manualSliceStartInput.addEventListener('input', ()=>{
    const val = Math.min(parseFloat(manualSliceStartInput.value) || 0, parseFloat(manualSliceEndInput?.value || '100'));
    manualSliceStartInput.value = val;
    if(manualSliceStartValue) manualSliceStartValue.textContent = `${Math.round(val)}%`;
  });
}

if(manualSliceEndInput){
  manualSliceEndInput.addEventListener('input', ()=>{
    const val = Math.max(parseFloat(manualSliceEndInput.value) || 0, parseFloat(manualSliceStartInput?.value || '0'));
    manualSliceEndInput.value = val;
    if(manualSliceEndValue) manualSliceEndValue.textContent = `${Math.round(val)}%`;
  });
}

if(manualSliceApplyBtn){
  manualSliceApplyBtn.addEventListener('click', applyManualSliceEdit);
}

if(manualSliceSplitBtn){
  manualSliceSplitBtn.addEventListener('click', splitManualSlice);
}

if(manualSliceDeleteBtn){
  manualSliceDeleteBtn.addEventListener('click', deleteManualSlice);
}

if(sliceListEl){
  sliceListEl.addEventListener('click', e=>{
    const btn = e.target.closest('[data-slice-play]');
    if(btn){
      const idx = parseInt(btn.getAttribute('data-slice-play'), 10);
      if(!Number.isNaN(idx)) previewSlice(idx);
      return;
    }
    const li = e.target.closest('li[data-slice-index]');
    if(!li) return;
    const idx = parseInt(li.dataset.sliceIndex, 10);
    if(!Number.isNaN(idx)) setManualSliceSelection(idx);
  });
}

resetSlicingWorkspace();
renderSlots();

// Keep the canvas pixel-perfect on high-DPI displays and resize on layout changes
function resizeWaveCanvas(){
  if(!waveCanvas) return;
  
  const dpr = window.devicePixelRatio || 1;
  
  // Get the container width - use parent's client width if available
  let cssW = waveCanvas.clientWidth;
  if(cssW <= 0) {
    const parent = waveCanvas.parentElement;
    if(parent) {
      cssW = parent.clientWidth - 32; // account for padding
    }
  }
  if(cssW <= 0) cssW = 600; // fallback
  
  const cssH = 130;
  const w = Math.floor(cssW * dpr);
  const h = Math.floor(cssH * dpr);
  
  if(waveCanvas.width !== w || waveCanvas.height !== h){
    waveCanvas.width = w;
    waveCanvas.height = h;
    waveCanvas.style.width = cssW + 'px';
    waveCanvas.style.height = cssH + 'px';
  }
}

window.addEventListener('resize', ()=>{
  // debounce resize slightly
  if(this._waveResizeTimeout) clearTimeout(this._waveResizeTimeout);
  this._waveResizeTimeout = setTimeout(()=>{
    resizeWaveCanvas();
  }, 80);
});

// Initialize AudioWorklet
async function initAudioWorklet() {
  try {
    await audioCtx.audioWorklet.addModule('audio-processor.js');
    audioWorkletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
    audioWorkletNode.connect(audioCtx.destination);
  } catch (err) {
    console.warn('AudioWorklet not supported, falling back to OfflineAudioContext:', err);
  }
}

initAudioWorklet();

function createSlot(i){
  const li = document.createElement('li');
  li.className = 'slotCard';
  li.setAttribute('data-slot', i);
  const label = SLOT_LABELS[i] || `slot ${i+1}`;
  li.innerHTML = `
    <div class="slotNumber">${i+1}</div>
    <div class="slotContent">
      <div class="slotHeader">
        <div class="slotName">${label}</div>
        <div class="waveFilename"></div>
      </div>
      <div class="slotWave" title="click to edit waveform">Drop audio or click to edit</div>
    </div>
    <button class="playButton" title="Play">▶</button>
    <div class="slotActions">
      <button class="open">open</button>
      <button class="edit">edit</button>
      <button class="remove">remove</button>
    </div>
  `;

  const openBtn = li.querySelector('.open');
  const removeBtn = li.querySelector('.remove');
  const editBtn = li.querySelector('.edit');
  const playBtn = li.querySelector('.playButton');
  const wave = li.querySelector('.slotWave');
  const filenameEl = li.querySelector('.waveFilename');

  openBtn.addEventListener('click',()=>{
    filePicker.onchange = e=>{
      if(!e.target.files || !e.target.files[0]) return;
      assignFileToSlot(i, e.target.files[0]);
      filePicker.value = '';
    };
    filePicker.click();
  });

  removeBtn.addEventListener('click',()=>{
    handleSlotRemoval(i);
  });

  editBtn.addEventListener('click', ()=> openSlotEditor(i));

  playBtn.addEventListener('click',()=>{
    toggleSlotPlayback(i);
  });

  wave.addEventListener('click', ()=> openSlotEditor(i));

  // allow drag drop onto slot
  wave.addEventListener('dragover', e=>{e.preventDefault(); wave.classList.add('dragover')});
  wave.addEventListener('dragleave', e=>{ e.preventDefault(); wave.classList.remove('dragover')});
  wave.addEventListener('drop', e=>{
    e.preventDefault(); wave.classList.remove('dragover');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) assignFileToSlot(i, f);
  });

  return li;
}

function renderSlots(){
  slotsEl.innerHTML='';
  for(let i=0;i<MAX_SLOTS;i++){
    slotsEl.appendChild(createSlot(i));
  }
}

function updateSlotUI(index){
  const card = document.querySelector(`.slotCard[data-slot="${index}"]`);
  const slot = slotAssignments[index];
  if(!card) return;
  const filenameEl = card.querySelector('.waveFilename');
  const wave = card.querySelector('.slotWave');
  if(slot && slot.processedBuffer){
    if(filenameEl) filenameEl.textContent = slot.filename || 'sample';
    if(wave) drawSmallWaveform(slot.processedBuffer, wave);
    card.classList.add('loaded');
  } else {
    if(filenameEl) filenameEl.textContent = '';
    if(wave){
      wave.style.backgroundImage = '';
      wave.textContent = 'Drop audio or click to edit';
    }
    card.classList.remove('loaded');
  }
}

function clearAllSlots(){
  stopActivePreview();
  slotAssignments = Array(MAX_SLOTS).fill(null);
  fileMap = new Map();
  currentKitName = null;
  if(kitNameEl) kitNameEl.textContent = '(none)';
  for(let i=0;i<MAX_SLOTS;i++) updateSlotUI(i);
  resetSlicingWorkspace();
}

async function assignFileToSlot(index, file){
  if(index == null || index < 0 || index >= MAX_SLOTS || !file) return;
  try {
    const buffer = await decodeAudioFileToBuffer(file);
    const slot = {
      file,
      filename: file.name,
      startPoint: 0,
      endPoint: 1,
      reverse: false,
      bitDepth: 16,
      sampleRate: buffer.sampleRate,
      buffer,
      processedBuffer: buffer
    };
    slotAssignments[index] = slot;
    updateSlotUI(index);
  } catch(err){
    console.error('Failed to assign file to slot', err);
  }
}

function handleSlotRemoval(index){
  if(index == null || index < 0 || index >= MAX_SLOTS) return;
  const slot = slotAssignments[index];
  if(activePreview && activePreview.kind === 'slot' && activePreview.id === index){
    stopActivePreview();
  }
  slotAssignments[index] = null;
  updateSlotUI(index);
}

function toggleSlotPlayback(index){
  const slot = slotAssignments[index];
  if(!slot || !slot.processedBuffer) return;
  if(isPreviewing('slot', index)){
    stopActivePreview();
    return;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = slot.processedBuffer;
  source.connect(audioCtx.destination);
  setActivePreview('slot', index, source, ()=>{});
}

function encodeWAV(audioBuffer){
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const numSamples = audioBuffer.length;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + numSamples * blockAlign);
  const view = new DataView(buffer);

  function writeString(offset, str){ for(let i=0;i<str.length;i++) view.setUint8(offset+i, str.charCodeAt(i)); }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * blockAlign, true);

  let offset = 44;
  const interleaved = new Float32Array(numSamples * numChannels);
  for(let i=0;i<numSamples;i++){
    for(let ch=0; ch<numChannels; ch++){
      interleaved[i*numChannels + ch] = audioBuffer.getChannelData(ch)[i];
    }
  }
  for(let i=0;i<interleaved.length;i++){
    let sample = Math.max(-1, Math.min(1, interleaved[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, sample, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// Audio processing functions
function bitcrush(audioBuffer, bitDepth) {
  if (bitDepth >= 16) return audioBuffer;
  
  try {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Create a new buffer
    const crushed = audioCtx.createBuffer(channels, length, sampleRate);
    
    // Calculate step for quantization
    const levels = Math.pow(2, bitDepth);
    const step = 2 / levels;
    
    for (let c = 0; c < channels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = crushed.getChannelData(c);
      
      for (let i = 0; i < length; i++) {
        // Clamp to [-1, 1]
        const sample = Math.max(-1, Math.min(1, src[i]));
        // Quantize
        dst[i] = step * Math.floor(sample / step + 0.5);
      }
    }
    
    console.log('Bitcrush applied:', bitDepth, 'bit');
    return crushed;
  } catch(err) {
    console.error('Bitcrush error:', err);
    return audioBuffer;
  }
}

function reverseAudio(audioBuffer) {
  // For export, reverse the audio buffer
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const reversed = audioCtx.createBuffer(channels, length, sampleRate);
  
  for (let c = 0; c < channels; c++) {
    const src = audioBuffer.getChannelData(c);
    const dst = reversed.getChannelData(c);
    for (let i = 0; i < length; i++) {
      dst[i] = src[length - 1 - i];
    }
  }
  return reversed;
}

function trimAudio(audioBuffer, startPercent, endPercent) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const startSample = Math.floor(length * startPercent);
  const endSample = Math.floor(length * endPercent);
  const newLength = Math.max(1, endSample - startSample);
  
  // Create trimmed buffer
  const trimmed = audioCtx.createBuffer(channels, newLength, audioBuffer.sampleRate);
  
  for(let c = 0; c < channels; c++) {
    const srcData = audioBuffer.getChannelData(c);
    const dstData = trimmed.getChannelData(c);
    for(let i = 0; i < newLength; i++) {
      dstData[i] = srcData[startSample + i];
    }
  }
  
  console.log('Trimmed from', startSample, 'to', endSample, 'new length:', newLength);
  return trimmed;
}

function resampleAudio(audioBuffer, targetSampleRate) {
  const originalSampleRate = audioBuffer.sampleRate;
  if (targetSampleRate >= originalSampleRate) return audioBuffer; // No upsampling
  
  const channels = audioBuffer.numberOfChannels;
  const originalLength = audioBuffer.length;
  const ratio = targetSampleRate / originalSampleRate;
  const newLength = Math.floor(originalLength * ratio);
  
  // Create new buffer with target sample rate
  const resampled = audioCtx.createBuffer(channels, newLength, targetSampleRate);
  
  for (let c = 0; c < channels; c++) {
    const srcData = audioBuffer.getChannelData(c);
    const dstData = resampled.getChannelData(c);
    
    // Simple linear interpolation resampling
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, originalLength - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      dstData[i] = srcData[srcIndexFloor] * (1 - fraction) + srcData[srcIndexCeil] * fraction;
    }
  }
  
  console.log('Resampled from', originalSampleRate, 'Hz to', targetSampleRate, 'Hz, length:', originalLength, '->', newLength);
  return resampled;
}

function processAudioBuffer(buffer, settings) {
  let processed = buffer;
  
  // Trim
  if(settings.startPoint !== 0 || settings.endPoint !== 1) {
    processed = trimAudio(processed, settings.startPoint, settings.endPoint);
  }
  
  // Reverse
  if(settings.reverse) {
    processed = reverseAudio(processed);
  }
  
  // Bitcrush
  if(settings.bitDepth && settings.bitDepth < 16) {
    processed = bitcrush(processed, settings.bitDepth);
  }
  
  // Resample
  if(settings.sampleRate && settings.sampleRate < processed.sampleRate) {
    processed = resampleAudio(processed, settings.sampleRate);
  }
  
  return processed;
}

function drawWaveform(audioBuffer, startPoint = 0, endPoint = 1) {
  if(!waveCanvas || !waveCtx || !audioBuffer) return;
  
  resizeWaveCanvas();
  
  // Ensure we have valid dimensions
  let w = waveCanvas.width;
  let h = waveCanvas.height;
  
  if(w <= 0 || h <= 0) {
    console.warn('Invalid canvas dimensions:', w, h);
    return;
  }
  
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const len = audioBuffer.length;
  
  if(len === 0) {
    console.warn('Empty audio buffer');
    return;
  }
  
  const samples = new Float32Array(len);
  
  for(let c = 0; c < channels; c++) {
    const ch = audioBuffer.getChannelData(c);
    for(let i = 0; i < len; i++) samples[i] += ch[i] / channels;
  }
  
  // Clear and draw background
  waveCtx.fillStyle = '#f1ece1';
  waveCtx.fillRect(0, 0, w, h);
  
  // Draw trimmed (inactive) regions
  const startX = Math.max(0, w * Math.max(0, startPoint));
  const endX = Math.min(w, w * Math.min(1, endPoint));
  
  if(startX > 0) {
    waveCtx.fillStyle = 'rgba(224, 85, 38, 0.08)';
    waveCtx.fillRect(0, 0, startX, h);
  }
  if(endX < w) {
    waveCtx.fillStyle = 'rgba(224, 85, 38, 0.08)';
    waveCtx.fillRect(endX, 0, w - endX, h);
  }
  
  // Draw waveform
  waveCtx.fillStyle = '#192a3c';
  const step = Math.max(1, Math.floor(samples.length / w));
  waveCtx.beginPath();
  
  for(let x = 0; x < w; x++) {
    const sampleIdx = Math.floor((x / w) * len);
    const start = sampleIdx;
    let min = 1, max = -1;
    
    for(let j = 0; j < step && (start + j) < samples.length; j++) {
      const v = samples[start + j];
      if(v < min) min = v;
      if(v > max) max = v;
    }
    
    const y1 = (1 - Math.max(-1, Math.min(1, max))) * 0.5 * h;
    const y2 = (1 - Math.max(-1, Math.min(1, min))) * 0.5 * h;
    
    if(x === 0) waveCtx.moveTo(x, y1);
    waveCtx.lineTo(x, y1);
    waveCtx.lineTo(x, y2);
  }
  
  waveCtx.closePath();
  waveCtx.fill();
  
  // Draw center line
  waveCtx.strokeStyle = 'rgba(25, 42, 60, 0.4)';
  waveCtx.lineWidth = Math.max(1, (window.devicePixelRatio || 1) * 0.5);
  waveCtx.beginPath();
  waveCtx.moveTo(0, h / 2);
  waveCtx.lineTo(w, h / 2);
  waveCtx.stroke();
  
  // Draw trim handles
  waveCtx.fillStyle = '#e05526';
  waveCtx.fillRect(Math.max(0, startX - 2), 0, 4, h);
  waveCtx.fillRect(Math.max(0, endX - 2), 0, 4, h);
}

function drawSmallWaveform(audioBuffer, containerEl) {
  if(!audioBuffer || !containerEl) return;
  
  // Create a temporary canvas for the small waveform
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const cssW = containerEl.clientWidth || 200;
  const cssH = 32;
  
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  
  ctx.scale(dpr, dpr);
  
  // Draw background
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, cssW, cssH);
  
  // Get audio data
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const len = audioBuffer.length;
  const samples = new Float32Array(len);
  
  for(let c = 0; c < channels; c++) {
    const ch = audioBuffer.getChannelData(c);
    for(let i = 0; i < len; i++) samples[i] += ch[i] / channels;
  }
  
  // Draw waveform
  ctx.fillStyle = '#192a3c';
  const step = Math.max(1, Math.floor(samples.length / cssW));
  ctx.beginPath();
  
  for(let x = 0; x < cssW; x++) {
    const sampleIdx = Math.floor((x / cssW) * len);
    const start = sampleIdx;
    let min = 1, max = -1;
    
    for(let j = 0; j < step && (start + j) < samples.length; j++) {
      const v = samples[start + j];
      if(v < min) min = v;
      if(v > max) max = v;
    }
    
    const y1 = (1 - Math.max(-1, Math.min(1, max))) * 0.5 * cssH;
    const y2 = (1 - Math.max(-1, Math.min(1, min))) * 0.5 * cssH;
    
    if(x === 0) ctx.moveTo(x, y1);
    ctx.lineTo(x, y1);
    ctx.lineTo(x, y2);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Draw center line
  ctx.strokeStyle = 'rgba(25, 42, 60, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, cssH / 2);
  ctx.lineTo(cssW, cssH / 2);
  ctx.stroke();
  
  // Replace the container's background with the waveform
  const dataUrl = canvas.toDataURL('image/png');
  containerEl.style.backgroundImage = `url('${dataUrl}')`;
  containerEl.style.backgroundSize = 'cover';
  containerEl.style.backgroundPosition = 'center';
  containerEl.textContent = '';
}

function drawEditorWaveform(audioBuffer, canvas, startRatio, endRatio) {
  if (!canvas || !audioBuffer) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Get audio data (mono mix)
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const len = audioBuffer.length;
  const step = Math.ceil(len / width);
  const amp = height / 2;
  
  ctx.fillStyle = '#e05526'; // Waveform color
  
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    const startSample = i * step;
    const endSample = Math.min(startSample + step, len);
    
    for (let j = startSample; j < endSample; j++) {
      let val = 0;
      for(let c=0; c<channels; c++){
         val += audioBuffer.getChannelData(c)[j];
      }
      val /= channels;
      
      if (val < min) min = val;
      if (val > max) max = val;
    }
    
    const yMin = (1 + min) * amp;
    const yMax = (1 + max) * amp;
    const h = Math.max(1, yMax - yMin);
    
    ctx.fillRect(i, yMin, 1, h);
  }
  
  // Draw Markers and Shading
  const startX = startRatio * width;
  const endX = endRatio * width;
  
  // Shade excluded areas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  if (startX > 0) {
    ctx.fillRect(0, 0, startX, height);
  }
  if (endX < width) {
    ctx.fillRect(endX, 0, width - endX, height);
  }
  
  // Draw lines
  ctx.lineWidth = 2;
  
  // Start Line
  ctx.strokeStyle = '#2196F3';
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  ctx.lineTo(startX, height);
  ctx.stroke();
  
  // End Line
  ctx.strokeStyle = '#F44336';
  ctx.beginPath();
  ctx.moveTo(endX, 0);
  ctx.lineTo(endX, height);
  ctx.stroke();
}

let currentEditingSlot = -1;

function openSlotEditor(index){
  const slot = slotAssignments[index];
  if(!slot || !slot.buffer) return;

  // If opening a different slot, close the current one first to reset state
  if(currentEditingSlot !== -1 && currentEditingSlot !== index) {
    closeSlotEditor();
  }

  currentEditingSlot = index;
  const panel = document.getElementById('slotEditorPanel');
  if(!panel) return;

  // Move panel inside the slot card
  const card = document.querySelector(`.slotCard[data-slot="${index}"]`);
  if(!card) return;
  
  card.appendChild(panel);
  panel.hidden = false;
  // panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Optional, might be annoying if it jumps

  // Populate controls
  document.getElementById('slotEditStart').value = (slot.startPoint || 0) * 100;
  document.getElementById('slotEditEnd').value = (slot.endPoint || 1) * 100;
  document.getElementById('slotEditReverse').checked = !!slot.reverse;
  document.getElementById('slotEditBitDepth').value = slot.bitDepth || 16;
  const startLabel = document.getElementById('slotEditStartLabel');
  const endLabel = document.getElementById('slotEditEndLabel');
  if(startLabel) startLabel.textContent = `${Math.round((slot.startPoint || 0) * 100)}%`;
  if(endLabel) endLabel.textContent = `${Math.round((slot.endPoint || 1) * 100)}%`;
  
  document.getElementById('slotEditTitle').textContent = `Editing Slot ${index + 1}`;
  
  // Draw Editor Waveform
  const canvas = document.getElementById('slotEditorCanvas');
  if(canvas) {
      drawEditorWaveform(slot.buffer, canvas, slot.startPoint || 0, slot.endPoint || 1);
  }
  
  // Highlight slot
  document.querySelectorAll('.slotCard').forEach(c => c.classList.remove('editing'));
  card.classList.add('editing');
}

function closeSlotEditor(){
  const panel = document.getElementById('slotEditorPanel');
  if(panel) {
    panel.hidden = true;
    // Move it back to main container or just leave it hidden where it is?
    // Better to leave it or move it to a safe place if we were destroying slots.
    // For now, hiding it is enough.
    document.body.appendChild(panel); // Move back to body to avoid layout issues when slot is removed
  }
  currentEditingSlot = -1;
  document.querySelectorAll('.slotCard').forEach(c => c.classList.remove('editing'));
}

function updateSlotFromEditor(){
  if(currentEditingSlot === -1) return;
  
  const start = parseFloat(document.getElementById('slotEditStart').value) / 100;
  const end = parseFloat(document.getElementById('slotEditEnd').value) / 100;
  const reverse = document.getElementById('slotEditReverse').checked;
  const bitDepth = parseInt(document.getElementById('slotEditBitDepth').value, 10);

  const slot = slotAssignments[currentEditingSlot];
  if(!slot) return;

  document.getElementById('slotEditStartLabel').textContent = Math.round(start * 100) + '%';
  document.getElementById('slotEditEndLabel').textContent = Math.round(end * 100) + '%';

  slot.startPoint = start;
  slot.endPoint = end;
  slot.reverse = reverse;
  slot.bitDepth = bitDepth;

  // Reprocess
  let buffer = slot.buffer;
  
  // 1. Trim
  if(start > 0 || end < 1){
    buffer = trimAudio(buffer, start, end);
  }
  
  // 2. Reverse
  if(reverse){
    buffer = reverseAudio(buffer);
  }
  
  // 3. Bitcrush
  if(bitDepth < 16){
    buffer = bitcrush(buffer, bitDepth);
  }
  
  slot.processedBuffer = buffer;
  
  // Update Waveform UI
  const card = document.querySelector(`.slotCard[data-slot="${currentEditingSlot}"]`);
  if(card){
    const wave = card.querySelector('.slotWave');
    drawSmallWaveform(buffer, wave);
  }

  // Update Editor Waveform
  const canvas = document.getElementById('slotEditorCanvas');
  if(canvas) {
      drawEditorWaveform(slot.buffer, canvas, start, end);
  }
}

// Bind editor controls
document.getElementById('slotEditClose')?.addEventListener('click', closeSlotEditor);
['slotEditStart', 'slotEditEnd', 'slotEditReverse', 'slotEditBitDepth'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateSlotFromEditor);
});

const slotEditStartLabelEl = document.getElementById('slotEditStartLabel');
const slotEditEndLabelEl = document.getElementById('slotEditEndLabel');
['slotEditStart','slotEditEnd'].forEach(id => {
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', ()=>{
    if(id === 'slotEditStart' && slotEditStartLabelEl) slotEditStartLabelEl.textContent = `${Math.round(el.value)}%`;
    if(id === 'slotEditEnd' && slotEditEndLabelEl) slotEditEndLabelEl.textContent = `${Math.round(el.value)}%`;
  });
});

document.getElementById('slotEditorPreview')?.addEventListener('click', () => {
  if(currentEditingSlot === -1) return;
  
  // Ensure state is up to date
  updateSlotFromEditor();

  const slot = slotAssignments[currentEditingSlot];
  if(!slot || !slot.processedBuffer) return;

  stopActivePreview();

  const source = audioCtx.createBufferSource();
  source.buffer = slot.processedBuffer;
  source.connect(audioCtx.destination);
  source.start(0);

  setActivePreview({
    kind: 'editor',
    id: currentEditingSlot,
    source,
    cleanup: () => {}
  });
});
