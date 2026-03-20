export class AmbientMusic {
  private ctx: AudioContext | null;
  private isPlaying = false;
  private nextNoteTime = 0;
  private currentStep = 0;
  private timerID: number | null = null;

  // C major pentatonic scale (C3 to C5)
  private frequencies = [
    130.81, // 0: C3
    146.83, // 1: D3
    164.81, // 2: E3
    196.00, // 3: G3
    220.00, // 4: A3
    261.63, // 5: C4
    293.66, // 6: D4
    329.63, // 7: E4
    392.00, // 8: G4
    440.00, // 9: A4
    523.25, // 10: C5
    587.33  // 11: D5
  ];

  // 64-step sequence (-1 means rest)
  // Bouncy, minimal puzzle game arpeggio
  private sequence = [
    7, -1, 8, -1,  9, -1, -1, 7,
    8, -1, 6, -1,  7, -1, -1, -1,
    5, -1, 7, -1,  6, -1, -1, 5,
    4, -1, 5, -1,  6, -1, 8, -1,

    7, -1, 8, -1,  9, -1, -1, 10,
    8, -1, 6, -1,  7, -1, -1, -1,
    5, -1, 7, -1,  6, -1, -1, 5,
    4, -1, 5, -1,  6, -1, 3, -1
  ];

  constructor(ctx: AudioContext | null) {
    this.ctx = ctx;
  }

  public play() {
    if (!this.ctx || this.isPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduleNextNotes();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduleNextNotes() {
    if (!this.isPlaying || !this.ctx) return;
    
    // Look-ahead schedule
    while (this.nextNoteTime < this.ctx.currentTime + 0.5) {
      const stepVal = this.sequence[this.currentStep % this.sequence.length];
      
      if (stepVal !== -1) {
        this.playPluck(this.nextNoteTime, this.frequencies[stepVal]);
        // Bazen arkaplanda çok hafif alt sesler de gelsin diye (bass)
        if (this.currentStep % 16 === 0) {
           this.playBass(this.nextNoteTime, this.frequencies[0]);
        } else if (this.currentStep % 16 === 8) {
           this.playBass(this.nextNoteTime, this.frequencies[4]);
        }
      }
      
      this.currentStep++;
      // Hız (Tempo): 16'lık notalar için 0.16 saniye (yaklaşık 95 BPM)
      this.nextNoteTime += 0.18; 
    }
    
    this.timerID = window.setTimeout(() => this.scheduleNextNotes(), 100);
  }

  private playPluck(time: number, freq: number) {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle'; // Game-like
    osc.frequency.setValueAtTime(freq, time);
    
    // SES SEVİYESİNİ ÇOK KISTIK (0.015 max)
    const peakVolume = 0.015; 
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peakVolume, time + 0.02); // quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4); // quick decay
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playBass(time: number, freq: number) {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine'; // Deep smooth bass
    osc.frequency.setValueAtTime(freq, time);
    
    const peakVolume = 0.02; // Very quiet background bass pad
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peakVolume, time + 0.2); 
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5); 
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 1.6);
  }
}
