import { songFromMidi, songToMidi } from "@signal-app/core"
import { FC, useCallback, useEffect } from "react"
import { useSetSong } from "../../actions/song"
import { useSong } from "../../hooks/useSong"

/**
 * PostMessageBridge enables communication between the Signal MIDI editor
 * (running in an iframe) and the parent MusicWave/MusicGen application.
 *
 * Supported incoming messages (from parent):
 *   { type: "LOAD_MIDI", data: number[] }  – loads a MIDI file into the editor
 *   { type: "REQUEST_MIDI" }               – requests the current song as MIDI
 *   { type: "PING" }                       – health check
 *
 * Outgoing messages (to parent):
 *   { type: "SAVE_MIDI", data: number[], name: string }
 *   { type: "MIDI_RESPONSE", data: number[], name: string }
 *   { type: "PONG" }
 *   { type: "SIGNAL_READY" }
 */
export const PostMessageBridge: FC = () => {
  const setSong = useSetSong()
  const { getSong } = useSong()

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Basic validation – ignore messages without a type
      const msg = event.data
      if (!msg || typeof msg.type !== "string") return

      switch (msg.type) {
        case "LOAD_MIDI": {
          try {
            const bytes = new Uint8Array(msg.data)
            const song = songFromMidi(bytes)
            if (msg.name) {
              song.name = msg.name
            }
            song.isSaved = true
            setSong(song)
            // Acknowledge load
            window.parent.postMessage({ type: "MIDI_LOADED", success: true }, "*")
          } catch (err) {
            console.error("[PostMessageBridge] Failed to load MIDI:", err)
            window.parent.postMessage(
              {
                type: "MIDI_LOADED",
                success: false,
                error: (err as Error).message,
              },
              "*",
            )
          }
          break
        }

        case "REQUEST_MIDI": {
          try {
            const song = getSong()
            const bytes = songToMidi(song)
            window.parent.postMessage(
              {
                type: "MIDI_RESPONSE",
                data: Array.from(bytes),
                name: song.name || "Untitled",
              },
              "*",
            )
          } catch (err) {
            console.error("[PostMessageBridge] Failed to export MIDI:", err)
          }
          break
        }

        case "PING": {
          window.parent.postMessage({ type: "PONG" }, "*")
          break
        }
      }
    },
    [setSong, getSong],
  )

  useEffect(() => {
    window.addEventListener("message", handleMessage)

    // Notify parent that Signal is ready to receive messages
    window.parent.postMessage({ type: "SIGNAL_READY" }, "*")

    return () => window.removeEventListener("message", handleMessage)
  }, [handleMessage])

  return null
}
