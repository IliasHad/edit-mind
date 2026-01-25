import { nanoid } from 'nanoid'

export function generateId() {
  return nanoid(4)
}
