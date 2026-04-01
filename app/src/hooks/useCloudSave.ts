import { songToMidi } from "@signal-app/core"
import { useCallback } from "react"
import { useSong } from "./useSong"

/**
 * Hook that sends the current song to the parent window (MusicWave dashboard)
 * via postMessage for cloud saving.
 */
export const useCloudSave = () => {
  const { getSong, setSaved } = useSong()

  const saveToCloud = useCallback(() => {
    try {
      const song = getSong()
      const bytes = songToMidi(song)
      window.parent.postMessage(
        {
          type: "SAVE_MIDI",
          data: Array.from(bytes),
          name: song.name || "Untitled",
        },
        "*",
      )
      setSaved(true)
    } catch (err) {
      console.error("[useCloudSave] Failed to save to cloud:", err)
      alert("Failed to save to cloud. Please try again.")
    }
  }, [getSong, setSaved])

  /** Returns true if running inside an iframe (embedded in MusicWave) */
  const isEmbedded = typeof window !== "undefined" && window.parent !== window

  return { saveToCloud, isEmbedded }
}
