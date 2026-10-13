// Synthesized futuristic cyber audio effects via Web Audio API.
// 100% client-side, zero external audio asset dependencies, ultra-low latency.

class CyberSoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = false
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.ctx = new AudioContext()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Soft tactile UI click
  playClick() {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04)

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.05)
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // Melodic affirmative chime for completions / quiz success
  playSuccess() {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const startTime = this.ctx.currentTime + idx * 0.06
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0.09, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + 0.2)
      })
    } catch {
      // Fallback
    }
  }

  // Futuristic warp speed / mission launch sweep
  playWarpSpeed() {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.6)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, now)
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.6)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.7)
    } catch {
      // Fallback
    }
  }

  // Command palette toggle / modal open
  playModal() {
    if (!this.enabled) return
    this.init()
    if (!this.ctx) return

    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(350, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.1)
    } catch {
      // Fallback
    }
  }
}

export const sound = new CyberSoundEngine()
