import { createContext, useContext, useState, useEffect } from 'react'
import { sound } from '../utils/sound.js'

const SoundContext = createContext({
  soundEnabled: false,
  toggleSound: () => {},
  playClick: () => {},
  playSuccess: () => {},
  playWarp: () => {},
  playModal: () => {},
})

export function SoundProvider({ children }) {
  // Default is FALSE as requested by prompt (toggleable, off by default)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('agentos_sound_enabled')
      return stored === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    sound.enabled = soundEnabled
    try {
      localStorage.setItem('agentos_sound_enabled', String(soundEnabled))
    } catch {
      // storage disabled
    }
  }, [soundEnabled])

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      sound.enabled = next
      if (next) {
        sound.init()
        sound.playSuccess()
      }
      return next
    })
  }

  const playClick = () => sound.playClick()
  const playSuccess = () => sound.playSuccess()
  const playWarp = () => sound.playWarpSpeed()
  const playModal = () => sound.playModal()

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        toggleSound,
        playClick,
        playSuccess,
        playWarp,
        playModal,
      }}
    >
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  return useContext(SoundContext)
}
