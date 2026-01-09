import { createFsFileStorage } from '@remix-run/file-storage/fs'
import os from "os"

export const fileStorage = createFsFileStorage(os.tmpdir())
