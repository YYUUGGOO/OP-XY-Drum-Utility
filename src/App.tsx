import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, HardDrive, Moon, Sparkles, Sun, Upload } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Slider } from './components/ui/slider';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { cn } from './lib/utils';
import { decodeFile, playBuffer, processBuffer } from './lib/audio';

type Slot = {
  id: number;
  name: string;
  status: 'empty' | 'ready';
  start: number;
  end: number;
  reverse: boolean;
  bitDepth: string;
  sampleRate: string;
  lengthLabel: string;
  buffer?: AudioBuffer;
  processed?: AudioBuffer;
};

const createSlots = (): Slot[] =>
  Array.from({ length: 24 }).map((_, idx) => ({
    id: idx + 1,
    name: 'Empty',
    status: 'empty',
    start: 0,
    end: 100,
    reverse: false,
    bitDepth: '16',
    sampleRate: '44100',
    lengthLabel: '—'
  }));

export default function App() {
  const [kitName, setKitName] = useState('OP XY kit');
  const [slots, setSlots] = useState<Slot[]>(createSlots);
  const [selectedSlotId, setSelectedSlotId] = useState(1);
  const [pendingSlotId, setPendingSlotId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [globalBitDepth, setGlobalBitDepth] = useState('16');
  const [globalSampleRate, setGlobalSampleRate] = useState('44100');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId) ?? slots[0], [slots, selectedSlotId]);
  const loadedCount = useMemo(() => slots.filter((slot) => slot.status === 'ready').length, [slots]);
  const hasContent = loadedCount > 0;

  const formatDuration = (buffer?: AudioBuffer) => {
    if (!buffer) return '—';
    const dur = buffer.duration;
    return dur >= 10 ? `${dur.toFixed(1)}s` : `${dur.toFixed(2)}s`;
  };

  const formatSampleRateLabel = (rate?: string) => {
    const r = Number(rate || '44100');
    if (!Number.isFinite(r)) return 'Sample rate';
    const khz = r / 1000;
    return `${khz % 1 === 0 ? khz.toFixed(0) : khz.toFixed(1)} kHz`;
  };

  const updateSlotSync = (id: number, partial: Partial<Slot> & { buffer?: AudioBuffer; processed?: AudioBuffer }) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== id) return slot;
        const next = { ...slot, ...partial } as Slot;
        if (partial.processed) {
          next.lengthLabel = formatDuration(partial.processed);
        }
        return next;
      })
    );
  };

  const reprocessSlot = (slot: Slot) => {
    if (!slot.buffer) return slot;
    const processed = processBuffer(slot.buffer, {
      start: slot.start / 100,
      end: slot.end / 100,
      reverse: slot.reverse,
      bitDepth: Number(slot.bitDepth),
      sampleRate: Number(slot.sampleRate)
    });
    return { ...slot, processed, lengthLabel: formatDuration(processed), status: 'ready' as const };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const startFrom = pendingSlotId ?? selectedSlotId;
      const targetSlot = startFrom + i - 1;
      const slotId = slots[targetSlot] ? slots[targetSlot].id : null;
      if (!slotId) break;
      const file = fileArray[i];
      try {
        const buffer = await decodeFile(file);
        const next: Slot = {
          ...slots.find((s) => s.id === slotId)!,
          name: file.name,
          status: 'ready',
          buffer,
          processed: buffer,
          bitDepth: globalBitDepth,
          sampleRate: globalSampleRate,
          lengthLabel: formatDuration(buffer)
        };
        const reprocessed = reprocessSlot(next);
        updateSlotSync(slotId, reprocessed);
      } catch (err) {
        console.error('Decode failed', err);
      }
    }
    setPendingSlotId(null);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const onBrowseClick = () => {
    setIsEditing(false);
    fileInputRef.current?.click();
  };

  const updateSlot = (partial: Partial<Slot>) => {
    if (!selectedSlot) return;
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== selectedSlot.id) return slot;
        const next = { ...slot, ...partial } as Slot;
        if (next.buffer) {
          const processedSlot = reprocessSlot(next);
          return processedSlot;
        }
        return next;
      })
    );
  };

  const applyGlobalFidelity = (nextBitDepth?: string, nextSampleRate?: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        const bitDepth = nextBitDepth ?? slot.bitDepth;
        const sampleRate = nextSampleRate ?? slot.sampleRate;
        const next = { ...slot, bitDepth, sampleRate } as Slot;
        if (slot.buffer) {
          return reprocessSlot(next);
        }
        return next;
      })
    );
  };

  const resetSlot = () => {
    if (!selectedSlot) return;
    const blank = { ...createSlots()[0], id: selectedSlot.id, bitDepth: globalBitDepth, sampleRate: globalSampleRate };
    setSlots((prev) => prev.map((slot) => (slot.id === selectedSlot.id ? blank : slot)));
  };

  const previewSelected = () => {
    const slot = slots.find((s) => s.id === selectedSlotId);
    if (!slot || !(slot.processed || slot.buffer)) return;
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    stopRef.current = playBuffer(slot.processed || slot.buffer);
  };

  useEffect(() => {
    const canvas = waveformRef.current;
    const slot = selectedSlot;
    if (!canvas || !isEditing || !(slot?.buffer)) return;

    const getColor = (name: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value ? `hsl(${value})` : fallback;
    };

    const buffer = slot.processed || slot.buffer;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 176;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const channels = Math.min(buffer.numberOfChannels, 2);
    const len = buffer.length;
    const data = new Float32Array(len);
    for (let c = 0; c < channels; c++) {
      const ch = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] += ch[i] / channels;
    }

    const step = Math.max(1, Math.floor(len / width));
    const bgColor = getColor('--muted', '#1f1f1f');
    const fgColor = getColor('--foreground', '#f5f5f5');
    const shadeColor = 'rgba(0,0,0,0.08)';
    const ringColor = getColor('--ring', '#888');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // shaded outside trim
    const startX = (slot.start / 100) * width;
    const endX = (slot.end / 100) * width;
    ctx.fillStyle = shadeColor;
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    ctx.fillStyle = fgColor;
    for (let x = 0; x < width; x++) {
      const idx = Math.floor((x / width) * len);
      let min = 1;
      let max = -1;
      for (let j = 0; j < step && idx + j < len; j++) {
        const v = data[idx + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 - max) * height) / 2;
      const y2 = ((1 - min) * height) / 2;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.fillStyle = ringColor;
    ctx.fillRect(Math.max(0, startX - 1), 0, 2, height);
    ctx.fillRect(Math.max(0, endX - 1), 0, 2, height);
  }, [selectedSlot?.buffer, selectedSlot?.processed, selectedSlot?.start, selectedSlot?.end, selectedSlotId, isEditing]);

  return (
    <div className="min-h-screen text-foreground fade-in-slow">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-secondary/80 via-secondary/40 to-secondary/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between fade-in-up">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold">OP-XY Drum Utility</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" type="button" disabled={!hasContent}>
              <Download className="h-4 w-4" /> Export kit
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                const subject = encodeURIComponent('Bug report: OP-XY Drum Utility');
                const body = encodeURIComponent('What happened?\nSteps to reproduce:\nExpected:\nActual:\nBrowser/OS:');
                window.location.href = `mailto:yuugo@yuugo.xyz?subject=${subject}&body=${body}`;
              }}
            >
              Report bug
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="gap-2"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </header>

        <Tabs defaultValue="kit" className="space-y-4">
          <TabsList className="w-fit">
            <TabsTrigger value="kit">Kit</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="kit" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1 hover-lift fade-in-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4 text-accent" /> Load samples
                  </CardTitle>
                  <CardDescription>Drop audio or pick a folder to populate the 24 drum slots.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-accent hover:text-foreground"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={onBrowseClick}
                  >
                    <Sparkles className="h-6 w-6 text-accent" />
                    <p className="font-medium text-foreground">Drop audio here</p>
                    <p className="max-w-[220px] text-xs text-muted-foreground">.wav / .aif / .flac — we will map them in order.</p>
                    <Button size="sm" variant="secondary" className="mt-2" type="button">
                      Browse files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kitName">Kit name</Label>
                    <Input id="kitName" value={kitName} onChange={(e) => setKitName(e.target.value)} placeholder="Name your kit" />
                    <p className="text-xs text-muted-foreground">{loadedCount}/24 slots loaded</p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Global fidelity</p>
                        <p className="text-xs text-muted-foreground">Applies bit depth + rate to every slot.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Bit depth</Label>
                        <Select
                          value={globalBitDepth}
                          onValueChange={(val) => {
                            setGlobalBitDepth(val);
                            applyGlobalFidelity(val, undefined);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Bit depth">{globalBitDepth}-bit</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16">16-bit (clean)</SelectItem>
                            <SelectItem value="12">12-bit</SelectItem>
                            <SelectItem value="8">8-bit</SelectItem>
                            <SelectItem value="4">4-bit lo-fi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Sample rate</Label>
                        <Select
                          value={globalSampleRate}
                          onValueChange={(val) => {
                            setGlobalSampleRate(val);
                            applyGlobalFidelity(undefined, val);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sample rate">{formatSampleRateLabel(globalSampleRate)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="44100">44.1 kHz</SelectItem>
                            <SelectItem value="26000">26 kHz (SP-1200)</SelectItem>
                            <SelectItem value="16000">16 kHz</SelectItem>
                            <SelectItem value="9000">9 kHz (SK-1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="lg:col-span-2 hover-lift fade-in-up">
                <CardHeader>
                  <CardTitle className="text-base">Drum Slots</CardTitle>
                  <CardDescription>Click a slot to load audio, then use Edit to open the detailed editor.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {slots.map((slot) => {
                      const isActive = slot.id === selectedSlot?.id;
                      const showEditor = isEditing && slot.id === selectedSlotId && slot.buffer;
                      return (
                        <div key={slot.id} className="flex flex-col gap-2">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedSlotId(slot.id);
                              setPendingSlotId(slot.id);
                              fileInputRef.current?.click();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedSlotId(slot.id);
                                setPendingSlotId(slot.id);
                                fileInputRef.current?.click();
                              }
                            }}
                            className={cn(
                              'group flex flex-col items-start gap-2 rounded-xl border border-border/70 bg-background/80 p-4 text-left transition hover:border-foreground/50 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2',
                              isActive && 'border-foreground bg-muted/80 shadow-[0_0_0_1px] shadow-foreground/40'
                            )}
                          >
                            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                              <span>Slot {slot.id.toString().padStart(2, '0')}</span>
                              <span className={cn('rounded-full px-2 py-0.5 text-[11px] uppercase', slot.status === 'ready' ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground')}>
                                {slot.status === 'ready' ? 'loaded' : 'empty'}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{slot.name}</p>
                            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                              <span>{slot.lengthLabel}</span>
                              <span>
                                {slot.bitDepth}-bit · {Math.round(Number(slot.sampleRate) / 1000)}kHz
                              </span>
                            </div>
                            {slot.status === 'ready' && (
                              <div className="flex w-full flex-wrap gap-2 text-xs text-muted-foreground">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSlotId(slot.id);
                                    previewSelected();
                                  }}
                                >
                                  Preview
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSlotId(slot.id);
                                    resetSlot();
                                    setIsEditing(false);
                                  }}
                                >
                                  Clear
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSlotId(slot.id);
                                    setIsEditing(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          {showEditor && (
                            <div className="animate-in slide-in-from-top-2 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-inner">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold">Slot editor</p>
                                  <p className="text-xs text-muted-foreground">Trim, fidelity, reverse</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={resetSlot}>
                                    Reset
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={previewSelected}>
                                    Preview
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                                    Close
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  <span>Trim range</span>
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span>Start</span>
                                    <Input
                                      type="number"
                                      className="h-8 w-16 px-2"
                                      value={slot.start}
                                      min={0}
                                      max={100}
                                      onChange={(e) => updateSlot({ start: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                    />
                                    <span>End</span>
                                    <Input
                                      type="number"
                                      className="h-8 w-16 px-2"
                                      value={slot.end}
                                      min={0}
                                      max={100}
                                      onChange={(e) => updateSlot({ end: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                    />
                                  </div>
                                </div>
                                <canvas ref={waveformRef} className="h-44 w-full rounded-xl border border-border/60 bg-muted" />
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={[slot.start, slot.end]}
                                  onValueChange={(values) => {
                                    if (values.length === 2) {
                                      const [start, end] = values;
                                      updateSlot({ start, end });
                                    }
                                  }}
                                />
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Bit depth</Label>
                                  <Select value={slot.bitDepth} onValueChange={(val) => updateSlot({ bitDepth: val })}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Bit depth" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="16">16-bit (clean)</SelectItem>
                                      <SelectItem value="12">12-bit</SelectItem>
                                      <SelectItem value="8">8-bit</SelectItem>
                                      <SelectItem value="4">4-bit lo-fi</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Sample rate</Label>
                                  <Select value={slot.sampleRate || '44100'} onValueChange={(val) => updateSlot({ sampleRate: val })}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sample rate">{formatSampleRateLabel(slot.sampleRate)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="44100">44.1 kHz</SelectItem>
                                      <SelectItem value="26000">26 kHz (SP-1200)</SelectItem>
                                      <SelectItem value="16000">16 kHz</SelectItem>
                                      <SelectItem value="9000">9 kHz (SK-1)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <div>
                                  <p className="font-medium">Reverse playback</p>
                                  <p className="text-sm text-muted-foreground">Great for snares and textures.</p>
                                </div>
                                <Switch checked={slot.reverse} onCheckedChange={(checked) => updateSlot({ reverse: checked })} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-3 hover-lift fade-in-up">
                <CardHeader>
                  <CardTitle className="text-base">Export</CardTitle>
                  <CardDescription>OP–XY preset with `patch.json` + samples folder.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Status</p>
                    <p>{hasContent ? 'Ready to export' : 'Load at least one sample to enable export.'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Bit depth & sample rate choices apply per slot before bundling.</p>
                  </div>
                  <Button className="w-full gap-2" type="button" disabled={!hasContent}>
                    <Download className="h-4 w-4" /> Download .preset zip
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="info">
            <Card className="fade-in-up">
              <CardHeader>
                <CardTitle className="text-base">How to use</CardTitle>
                <CardDescription>Quick steps for building an OP-XY kit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Load samples:</strong> drop audio files or click Browse; they fill the 24 slots in order.</p>
                <p><strong>Edit a slot:</strong> click a slot, trim start/end, toggle reverse, and pick bit depth/sample rate. Shaded waveform shows what’s trimmed out.</p>
                <p><strong>Global settings:</strong> set global bit depth and sample rate to push those values to every slot at once.</p>
                <p><strong>Preview:</strong> use Preview on a loaded slot to hear the processed audio.</p>
                <p><strong>Export:</strong> once a slot is loaded, use Export kit to package a `.preset` (processing hookup in progress).</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="mt-6 flex items-center justify-center text-xs text-muted-foreground">
          <a
            href="https://yuugo.xyz"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border/70 bg-background/60 px-3 py-1 transition hover:border-foreground hover:text-foreground"
          >
            Built by Yuugo →
          </a>
        </footer>
      </div>
    </div>
  );
}
