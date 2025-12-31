import { z, type ZodPromise, type ZodTypeAny } from 'zod'
import { windowIpcSchema } from './window-schema'
import { appIpcSchema } from './app-schema'

export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
} as const

type SchemaReturn<T extends ZodTypeAny> = T extends ZodPromise<infer U> ? U : T

export type IPCChannels = {
  [K in keyof typeof ipcSchemas]: {
    args: z.infer<(typeof ipcSchemas)[K]['args']>
    return: z.infer<SchemaReturn<(typeof ipcSchemas)[K]['return']>>
  }
}

export type ChannelName = keyof typeof ipcSchemas
export type ChannelArgs<T extends ChannelName> = IPCChannels[T]['args']
export type ChannelReturn<T extends ChannelName> = IPCChannels[T]['return']

// Runtime validation helpers
export const validateArgs = <T extends ChannelName>(channel: T, args: unknown[]): ChannelArgs<T> => {
  return ipcSchemas[channel].args.parse(args) as ChannelArgs<T>
}

export const validateReturn = <T extends ChannelName>(channel: T, data: unknown): ChannelReturn<T> => {
  return ipcSchemas[channel].return.parse(data) as ChannelReturn<T>
}
