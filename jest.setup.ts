import { TextDecoder, TextEncoder } from 'util'
import { Blob, File } from 'buffer'
import { ReadableStream, TransformStream, WritableStream } from 'stream/web'
import { MessageChannel, MessagePort, BroadcastChannel } from 'worker_threads'
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Set TextEncoder/Decoder and Streams/Message globals first because undici needs them on load
global.TextDecoder = TextDecoder as any
global.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder as any
globalThis.TextEncoder = TextEncoder

global.ReadableStream = ReadableStream as any
global.TransformStream = TransformStream as any
global.WritableStream = WritableStream as any
globalThis.ReadableStream = ReadableStream as any
globalThis.TransformStream = TransformStream as any
globalThis.WritableStream = WritableStream as any

global.MessageChannel = MessageChannel as any
global.MessagePort = MessagePort as any
globalThis.MessageChannel = MessageChannel as any
globalThis.MessagePort = MessagePort as any

global.BroadcastChannel = BroadcastChannel as any
globalThis.BroadcastChannel = BroadcastChannel as any

// Now load undici after globals are set
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would hoist above the globals this module reads at load time
const { fetch, Headers, FormData, Request, Response } = require('undici')

const polyfills = {
  TextDecoder: { value: TextDecoder, writable: true, enumerable: true, configurable: true },
  TextEncoder: { value: TextEncoder, writable: true, enumerable: true, configurable: true },
  Blob: { value: Blob, writable: true, enumerable: true, configurable: true },
  File: { value: File, writable: true, enumerable: true, configurable: true },
  fetch: { value: fetch, writable: true, enumerable: true, configurable: true },
  Headers: { value: Headers, writable: true, enumerable: true, configurable: true },
  FormData: { value: FormData, writable: true, enumerable: true, configurable: true },
  Request: { value: Request, writable: true, enumerable: true, configurable: true },
  Response: { value: Response, writable: true, enumerable: true, configurable: true },
  Event: { value: globalThis.Event, writable: true, enumerable: true, configurable: true },
  EventTarget: {
    value: globalThis.EventTarget,
    writable: true,
    enumerable: true,
    configurable: true,
  },
  ReadableStream: { value: ReadableStream, writable: true, enumerable: true, configurable: true },
  TransformStream: { value: TransformStream, writable: true, enumerable: true, configurable: true },
  WritableStream: { value: WritableStream, writable: true, enumerable: true, configurable: true },
  BroadcastChannel: {
    value: BroadcastChannel,
    writable: true,
    enumerable: true,
    configurable: true,
  },
}

Object.defineProperties(global, polyfills)
Object.defineProperties(globalThis, polyfills)

// jsdom has no matchMedia; hooks/use-media-query.ts needs it. Default to "no match".
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
