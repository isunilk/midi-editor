import { useTheme } from "@emotion/react"
import ChevronRight from "mdi-react/ChevronRightIcon"
import CloudUpload from "mdi-react/CloudUploadIcon"
import KeyboardArrowDown from "mdi-react/KeyboardArrowDownIcon"
import { FC, useCallback, useState } from "react"
import { hasFSAccess } from "../../actions/file"
import { useAuth } from "../../hooks/useAuth"
import { useCloudSave } from "../../hooks/useCloudSave"
import { useExport } from "../../hooks/useExport"
import { useRootView } from "../../hooks/useRootView"
import { Localized } from "../../localize/useLocalization"
import { Menu, MenuDivider, MenuItem, SubMenu } from "../ui/Menu"
import { CloudFileMenu } from "./CloudFileMenu"
import { FileMenu } from "./FileMenu"
import { LegacyFileMenu } from "./LegacyFileMenu"
import { Tab } from "./Navigation"

export const FileMenuButton: FC = () => {
  const { authUser: user } = useAuth()
  const { setOpenSignInDialog } = useRootView()
  const { exportSong } = useExport()
  const { saveToCloud, isEmbedded } = useCloudSave()
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)

  const handleClose = useCallback(() => setOpen(false), [])

  const onClickExportWav = useCallback(() => {
    handleClose()
    exportSong("WAV")
  }, [handleClose, exportSong])

  const onClickExportMp3 = useCallback(() => {
    handleClose()
    exportSong("MP3")
  }, [handleClose, exportSong])

  const onClickSaveToCloud = useCallback(() => {
    handleClose()
    saveToCloud()
  }, [handleClose, saveToCloud])

  return (
    <Menu
      open={isOpen}
      onOpenChange={setOpen}
      trigger={
        <Tab id="tab-file">
          <span style={{ marginLeft: "0.25rem" }}>
            <Localized name="file" />
          </span>
          <KeyboardArrowDown style={{ width: "1rem", marginLeft: "0.25rem" }} />
        </Tab>
      }
    >
      {/* When embedded in MusicWave, always show the local file menu (no cloud/auth) */}
      {isEmbedded && (
        <>
          {hasFSAccess && <FileMenu close={handleClose} />}
          {!hasFSAccess && <LegacyFileMenu close={handleClose} />}

          <MenuDivider />

          <MenuItem onClick={onClickSaveToCloud}>
            <CloudUpload style={{ marginRight: "0.5em" }} />
            Save to Cloud
          </MenuItem>
        </>
      )}

      {/* Original behavior when NOT embedded */}
      {!isEmbedded && (
        <>
          {user === null && hasFSAccess && <FileMenu close={handleClose} />}
          {user === null && !hasFSAccess && <LegacyFileMenu close={handleClose} />}
          {user && <CloudFileMenu close={handleClose} />}

          {user === null && (
            <>
              <MenuDivider />
              <MenuItem
                onClick={() => {
                  handleClose()
                  setOpenSignInDialog(true)
                }}
              >
                <Localized name="please-sign-up" />
              </MenuItem>
            </>
          )}
        </>
      )}

      <MenuDivider />

      <SubMenu
        trigger={
          <MenuItem>
            <Localized name="export" />
            <ChevronRight
              style={{ marginLeft: "auto", fill: theme.tertiaryTextColor }}
            />
          </MenuItem>
        }
      >
        <MenuItem onClick={onClickExportWav}>WAV</MenuItem>
        <MenuItem onClick={onClickExportMp3}>MP3</MenuItem>
      </SubMenu>
    </Menu>
  )
}
