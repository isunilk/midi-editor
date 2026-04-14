import { Song, songFromMidi, songToMidi } from "@signal-app/core"
import { downloadBlob } from "../helpers/Downloader"
import { basename } from "../helpers/path"
import { writeFile } from "../services/fs-helper"
import { useSetSong } from "./song"

// URL parameter for automation purposes used in scripts/perf/index.js
// /edit?disableFileSystem=true
export const disableFileSystem =
  new URL(window.location.href).searchParams.get("disableFileSystem") === "true"

export const hasFSAccess =
  ("chooseFileSystemEntries" in window || "showOpenFilePicker" in window) &&
  !disableFileSystem

/** True when this page is running inside an iframe (e.g. embedded in MusicWave) */
const isInIframe = typeof window !== "undefined" && window.parent !== window

/**
 * When embedded in the MusicWave parent app we delegate window.confirm() to
 * the parent window so the browser dialog shows "musicwave.ai" instead of
 * the raw Vercel deployment URL.
 *
 * Protocol:
 *   → { type: "REQUEST_CONFIRM", message: string }    (iframe → parent)
 *   ← { type: "CONFIRM_RESPONSE", result: boolean }   (parent → iframe)
 */
export const confirmViaParent = (message: string): Promise<boolean> =>
  new Promise((resolve) => {
    const handleResponse = (event: MessageEvent) => {
      const msg = event.data
      if (!msg || msg.type !== "CONFIRM_RESPONSE") return
      window.removeEventListener("message", handleResponse)
      resolve(!!msg.result)
    }
    window.addEventListener("message", handleResponse)
    window.parent.postMessage({ type: "REQUEST_CONFIRM", message }, "*")
  })

/**
 * Wrapper around confirm() that delegates to parent when in iframe.
 */
export const iframeConfirm = async (message: string): Promise<boolean> => {
  if (isInIframe) {
    return confirmViaParent(message)
  }
  return confirm(message)
}

/**
 * When embedded in the MusicWave parent app we delegate file-open to the
 * parent window so the browser's file-picker dialog shows "musicwave.ai"
 * instead of the raw Vercel deployment URL.
 *
 * Protocol:
 *   → { type: "REQUEST_FILE_OPEN" }           (iframe → parent)
 *   ← { type: "OPEN_FILE_RESPONSE",           (parent → iframe)
 *        data: number[], name: string }
 */
const openFileViaParent = (setSong: ReturnType<typeof useSetSong>) =>
  new Promise<void>((resolve) => {
    const handleResponse = (event: MessageEvent) => {
      const msg = event.data
      if (!msg || msg.type !== "OPEN_FILE_RESPONSE") return

      window.removeEventListener("message", handleResponse)

      try {
        const bytes = new Uint8Array(msg.data as number[])
        const song = songFromArrayBuffer(
          bytes.buffer as ArrayBuffer,
          undefined,
          (msg.name as string) || "Untitled",
        )
        setSong(song)
      } catch (err) {
        console.error("[openFileViaParent] Failed to parse MIDI:", err)
      }

      resolve()
    }

    window.addEventListener("message", handleResponse)
    window.parent.postMessage({ type: "REQUEST_FILE_OPEN" }, "*")
  })

export const useOpenFile = () => {
  const setSong = useSetSong()

  return async () => {
    // When embedded in an iframe, ask the parent to show the file picker so
    // the browser dialog reads "musicwave.ai" rather than the Vercel URL.
    if (isInIframe) {
      await openFileViaParent(setSong)
      return
    }

    let fileHandle: FileSystemFileHandle
    try {
      fileHandle = (
        await window.showOpenFilePicker({
          types: [
            {
              description: "MIDI file",
              accept: { "audio/midi": [".mid"] },
            },
          ],
        })
      )[0]
    } catch (ex) {
      if ((ex as Error).name === "AbortError") {
        return
      }
      const msg = "An error occured trying to open the file."
      console.error(msg, ex)
      alert(msg)
      return
    }
    const file = await fileHandle.getFile()
    const song = await songFromFile(file)
    song.fileHandle = fileHandle
    setSong(song)
  }
}

export const songFromFile = async (file: File) =>
  songFromArrayBuffer(
    await file.arrayBuffer(),
    "path" in file ? (file.path as string) : undefined,
    file.name,
  )

// Use the file name without extension as the song title
const getNameFromPathOrName = (pathOrName: string) => {
  return basename(pathOrName)?.replace(/\.[^/.]+$/, "") ?? ""
}

export const songFromArrayBuffer = (
  content: ArrayBuffer,
  filePath?: string,
  name?: string,
) => {
  const song = songFromMidi(new Uint8Array(content))
  const pathOrName = filePath ?? name
  if (song.name.length === 0 && pathOrName) {
    // Use the file name without extension as the song title
    song.name = getNameFromPathOrName(pathOrName)
  }
  if (filePath) {
    song.filepath = filePath
  }
  song.isSaved = true
  return song
}

export const saveFile = async (song: Song) => {
  // When embedded in iframe, use blob download to avoid showing vercel domain
  if (isInIframe) {
    saveViaBlobDownload(song)
    return
  }

  const fileHandle = song.fileHandle
  if (fileHandle === null) {
    await saveFileAs(song)
    return
  }

  const data = songToMidi(song).buffer as ArrayBuffer
  try {
    await writeFile(fileHandle, data)
    song.isSaved = true
  } catch (e) {
    console.error(e)
    alert("unable to save file")
  }
}

export const saveFileAs = async (song: Song) => {
  // When embedded in iframe, use blob download to avoid showing vercel domain
  if (isInIframe) {
    saveViaBlobDownload(song)
    return
  }

  let fileHandle
  try {
    fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "MIDI file",
          accept: { "audio/midi": [".mid"] },
        },
      ],
    })
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  try {
    const data = songToMidi(song).buffer as ArrayBuffer
    await writeFile(fileHandle, data)
    song.fileHandle = fileHandle
    song.name = getNameFromPathOrName(fileHandle.name)
    song.isSaved = true
  } catch (ex) {
    const msg = "Unable to save file."
    console.error(msg, ex)
    alert(msg)
    return
  }
}

/** Download MIDI via blob link — no native file picker, so no domain shown */
const saveViaBlobDownload = (song: Song) => {
  const bytes = songToMidi(song)
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "audio/midi",
  })
  const fileName =
    (song.name || song.filepath || "untitled").replace(/\.mid$/i, "") + ".mid"
  downloadBlob(blob, fileName)
  song.isSaved = true
}
