export type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type ProtocolDirection = 'client-to-agent' | 'agent-to-client'

export type ProtocolFrameKind =
  | 'request'
  | 'response'
  | 'notification'
  | 'invalid-json'
  | 'stdout-noise'

export interface ProtocolTraceFrame {
  readonly id: string
  readonly runId: string
  readonly connectionId: string
  readonly sequence: number
  readonly timestamp: string
  readonly protocolVersion: 'v1'
  readonly direction: ProtocolDirection
  readonly kind: ProtocolFrameKind
  readonly raw: string
  readonly byteLength: number
  readonly parsed?: JsonValue
  readonly requestId?: string | number | null
  readonly method?: string
  readonly parseError?: string
}

export type ProtocolTraceListener = (frame: ProtocolTraceFrame) => void
