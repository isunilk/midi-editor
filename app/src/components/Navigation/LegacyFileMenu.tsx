import { ChangeEvent, FC } from "react"
import { useSongFile } from "../../hooks/useSongFile"
import { Localized } from "../../localize/useLocalization"
import { MenuDivider, MenuItem } from "../ui/Menu"

export const fileInputID = "OpenButtonInputFile"

/** True when running inside an iframe (e.g. embedded in MusicWave dashboard) */
const isInIframe = typeof window !== "undefined" && window.parent !== window

export const FileInput: FC<
  React.PropsWithChildren<{
    onChange: (e: ChangeEvent<HTMLInputElement>) => void
    accept?: string
    id?: string
  }>
> = ({ onChange, children, accept, id }) => (
  <>
    <input
      accept={accept}
      style={{ display: "none" }}
      id={id ?? fileInputID}
      type="file"
      onChange={onChange}
    />
    <label htmlFor={id ?? fileInputID}>{children}</label>
  </>
)

export const LegacyFileMenu: FC<{ close: () => void }> = ({ close }) => {
  const { createNewSong, openSong, openSongLegacy, downloadSong } =
    useSongFile()

  const onClickNew = async () => {
    close()
    await createNewSong()
  }

  const onClickOpen = async (e: ChangeEvent<HTMLInputElement>) => {
    close()
    await openSongLegacy(e)
  }

  // When embedded, delegate file-open to the parent so the browser dialog
  // shows "musicwave.ai" instead of the Vercel deployment URL.
  const onClickOpenViaParent = async () => {
    close()
    await openSong()
  }

  const onClickSave = async () => {
    close()
    await downloadSong()
  }

  return (
    <>
      <MenuItem onClick={onClickNew}>
        <Localized name="new-song" />
      </MenuItem>

      <MenuDivider />

      {/* When embedded in an iframe, use a plain click handler that delegates
          to the parent window. The <label>+<input> pattern would trigger the
          native file dialog attributed to the iframe's origin. */}
      {isInIframe ? (
        <MenuItem onClick={onClickOpenViaParent}>
          <Localized name="open-song" />
        </MenuItem>
      ) : (
        <FileInput onChange={onClickOpen} accept=".mid,audio/midi">
          <MenuItem>
            <Localized name="open-song" />
          </MenuItem>
        </FileInput>
      )}

      <MenuItem onClick={onClickSave}>
        <Localized name="save-song" />
      </MenuItem>
    </>
  )
}
