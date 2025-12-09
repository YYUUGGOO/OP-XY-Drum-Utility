# DrumKit Maker - OP-XY Edition

Drum kit builder for Teenage Engineering's **OP-XY**. The UI is now rebuilt with **Vite + React + Tailwind + shadcn**; audio/rendering hooks from the legacy app are being reattached.

> Status: shadcn UI scaffolded (24 slots, trim controls, bit depth/sample rate toggles, reverse switch, export button). Waveform preview and actual audio processing/export wiring are pending.

## Local development

```bash
npm install
npm run dev   # start UI
npm run build # ensure the bundle compiles
```

## Features

### 🎵 Current UI
- **24-slot pad grid** with per-slot trim range, bit depth, sample rate, and reverse toggles
- **Drag & drop / file picker** to map audio files in pad order
- **Slot status + metadata** cards to track what is loaded
- **Export CTA** (disabled until at least one slot is loaded)

### 🧭 Pending wiring (legacy engine)
- Waveform preview + transient-aware trim
- Rendered audio with bit depth / sample rate applied
- ZIP export with `patch.json` and baked samples
- Import of existing `.preset` folders

### 🎨 Features by Component

#### Slot Editor
Each of the 24 sample slots includes:
- **Waveform display** - Click to toggle editing panel
- **Start/End sliders** - Drag to adjust trim points (0-100%)
- **Reverse checkbox** - Toggle sample playback direction
- **Bit depth selector** - Choose lo-fi effect intensity:
  - 16-bit: Original quality
  - 12-bit: Subtle degradation
  - 8-bit: Classic lo-fi sound
  - 4-bit: Extreme bitcrushing (Casio SK-1 vibe)
- **Quick actions**: Open, Remove buttons

#### Global Waveform Editor
- Displays currently selected sample
- Shows trimmed regions in context
- Overlays start/end point handles
- Updates in real-time as you adjust sliders

#### Import/Export
- **Drop zone** - Drag `.preset` folders with `patch.json`
- **Open folder** - Select a kit directory
- **Add files** - Append more samples to existing kit
- **Export kit** - Download as `{kitname}.preset.zip`

## How to Use

### 1. Load a Kit
- **Drag & drop**: Drop a `.preset` folder into the drop zone
- **Open folder**: Click "Open folder" and select a kit directory
- **Add files**: Click "Add audio files" to add samples one by one

### 2. Edit Samples
1. Click on a sample slot to reveal the waveform
2. Adjust **Start** slider to trim the beginning
3. Adjust **End** slider to trim the end
4. Check **Reverse** to play backwards
5. Select **Bit Depth** for lo-fi effects:
   - 4-bit = maximum Casio SK-1 character
   - 8-bit = classic digital sound
   - 12-bit = subtle warmth
   - 16-bit = clean original

### 3. Preview Changes
- Click the waveform area to play the sample with all edits applied
- The global waveform display shows both original and trimmed regions

### 4. Export Your Kit
1. Adjust all samples as needed
2. Click **Export kit (zip)**
3. Choose a kit name when prompted
4. Download the `.preset.zip` file
5. Transfer to your OP-XY:
   - Connect OP-XY to computer
   - Extract the `.preset.zip` file
   - Copy the `.preset` folder to your OP-XY's media

## Technical Details

### Audio Processing
- **Trimming**: Zero-crossing aware frame-based trimming
- **Reversal**: Full channel reversal with no artifacts
- **Bitcrushing**: Quantization to N-bit depth for vintage digital character
- **WAV encoding**: All samples exported as 16-bit stereo WAV files

### OP-XY Integration
- **Regions format**: Full support for OP-XY's region-based MIDI mapping
- **Pitch mapping**: Automatic MIDI note assignment (starting from note 53)
- **Envelope/FX**: Preserved from source kits or populated with defaults
- **Version**: Compatible with OP-XY patch format v4

### Browser Compatibility
- ✅ Chrome/Edge (Chromium 90+) - Full support
- ✅ Safari (15+) - Full support with webkitdirectory
- ✅ Firefox (90+) - Full support
- ⚠️ Mobile browsers - Limited by OS file access restrictions

## File Structure

```
my-kit.preset/
├── patch.json           # OP-XY configuration
├── drum_01.wav         # Sample 1 (with edits applied)
├── drum_02.wav         # Sample 2 (with edits applied)
├── ...
└── drum_24.wav         # Sample 24 (with edits applied)
```

The `patch.json` includes:
```json
{
  "engine": { /* synthesis parameters */ },
  "envelope": { /* amp and filter envelopes */ },
  "fx": { /* effects settings */ },
  "lfo": { /* LFO configuration */ },
  "regions": [
    {
      "sample": "drum_01.wav",
      "hikey": 53,
      "lokey": 53,
      "pitch.keycenter": 60,
      "playmode": "oneshot",
      "reverse": false,
      "framecount": 44100,
      "sample.end": 44100
    },
    /* ... more regions ... */
  ]
}
```

## Tips & Tricks

### Casio SK-1 Emulation
1. Load a vocal or drum sample
2. Set Bit Depth to **4-bit** for maximum lo-fi
3. Use Start/End sliders to grab just the juicy part
4. Reverse for backwards vocals
5. Export and load into OP-XY for authentic vintage vibes

### Bulk Import
- Organize samples in a folder with a `patch.json`
- Drag the entire folder into the drop zone
- The editor auto-loads all settings and samples

### Quality Preservation
- Original samples are never modified
- All edits are applied during export
- Re-export with different settings without re-importing

## Advanced Tips

### Custom MIDI Mapping
Edit `patch.json` directly to:
- Reassign hikey/lokey for different MIDI note ranges
- Adjust region order
- Modify transpose or tuning

### Batch Processing
- Load a kit
- Edit all 24 slots with consistent settings
- Export as a new `.preset`
- Repeat for variations (different bit depths, reverse passes)

## Keyboard Shortcuts
- (Future) Spacebar to play selected sample
- (Future) Delete to remove selected slot

## Known Limitations
- Single audio context - can only play one preview at a time
- WAV format only for export (OP-XY standard)
- Maximum 24 samples per kit (OP-XY hardware limit)
- Bitcrushing works best with samples above 22kHz

## Future Enhancements
- [ ] Real-time waveform editing with mouse drag
- [ ] Sample normalization and auto-gain
- [ ] Multiple undo/redo history
- [ ] Keyboard shortcuts for common actions
- [ ] Sample slice detection and auto-trimming
- [ ] A/B comparison between edits
- [ ] Batch export of multiple kits
- [ ] Integration with OP-XY firmware updates

## Troubleshooting

### "Cannot read property 'generateAsync' of undefined"
- JSZip library failed to load - check your internet connection
- Try refreshing the page

### Audio preview doesn't work
- Ensure your browser allows Web Audio API access
- Check browser console (F12) for errors
- Try a different browser

### Folder picker not working
- Use Chrome, Safari (15+), or Edge (90+)
- Firefox requires manual file selection
- Mobile browsers don't support directory picking

### Exported kit doesn't load on OP-XY
- Ensure folder name ends with `.preset`
- Check that `patch.json` is in the root folder
- Verify all sample filenames match in both files and JSON
- Try re-encoding samples using the editor's export

## License & Attribution

OP-XY is a product of **Teenage Engineering**. This tool is a fan-made companion for kit creation and editing, not officially affiliated.

The bitcrushing algorithm is inspired by Casio SK-1 sampling techniques from the 1985 era.

---

**Made with ❤️ for drum machine enthusiasts**

For questions or feature requests, check the console for debugging helpers:
```javascript
// In browser console:
window._OPXY.slotAssignments  // View all loaded samples and settings
window._OPXY.fileMap          // View imported files
```
