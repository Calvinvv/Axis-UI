import type {
  JsonValue,
  ProtocolDirection,
  ProtocolFrameKind,
  ProtocolTraceFrame,
  ProtocolTraceListener,
  SequenceAllocator,
} from '@axis-ui/acp-core'

export interface TransportTapOptions {
  readonly runId: string
  readonly connectionId: string
  readonly sequence: SequenceAllocator
  readonly onFrame?: ProtocolTraceListener
  readonly now?: () => Date
}

interface FrameDetails {
  readonly kind: ProtocolFrameKind
  readonly parsed?: JsonValue
  readonly requestId?: string | number | null
  readonly method?: string
  readonly parseError?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function classify(raw: string): FrameDetails {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch (error) {
    return {
      kind: 'invalid-json',
      parseError: error instanceof Error ? error.message : String(error),
    }
  }

  if (!isRecord(parsed)) {
    return { kind: 'stdout-noise', parsed: parsed as JsonValue }
  }

  const requestId =
    typeof parsed.id === 'string' ||
    typeof parsed.id === 'number' ||
    parsed.id === null
      ? parsed.id
      : undefined
  const method = typeof parsed.method === 'string' ? parsed.method : undefined

  if (method !== undefined) {
    return {
      kind: requestId === undefined ? 'notification' : 'request',
      parsed: parsed as JsonValue,
      requestId,
      method,
    }
  }
  if (
    requestId !== undefined &&
    (Object.hasOwn(parsed, 'result') || Object.hasOwn(parsed, 'error'))
  ) {
    return { kind: 'response', parsed: parsed as JsonValue, requestId }
  }
  return { kind: 'stdout-noise', parsed: parsed as JsonValue }
}

class LineObserver {
  private readonly decoder = new TextDecoder()
  private pending = ''

  constructor(private readonly emitLine: (line: string) => void) {}

  push(chunk: Uint8Array): void {
    this.pending += this.decoder.decode(chunk, { stream: true })
    this.drain(false)
  }

  finish(): void {
    this.pending += this.decoder.decode()
    this.drain(true)
  }

  private drain(flush: boolean): void {
    let newline = this.pending.indexOf('\n')
    while (newline >= 0) {
      const line = this.pending.slice(0, newline).replace(/\r$/u, '')
      this.pending = this.pending.slice(newline + 1)
      this.emitLine(line)
      newline = this.pending.indexOf('\n')
    }
    if (flush && this.pending.length > 0) {
      this.emitLine(this.pending)
      this.pending = ''
    }
  }
}

export class TransportTap {
  private readonly recordedFrames: ProtocolTraceFrame[] = []

  constructor(private readonly options: TransportTapOptions) {}

  get frames(): readonly ProtocolTraceFrame[] {
    return this.recordedFrames
  }

  tapReadable(
    source: ReadableStream<Uint8Array>,
    direction: ProtocolDirection
  ): ReadableStream<Uint8Array> {
    const observer = this.createObserver(direction)
    return source.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          observer.push(chunk)
          controller.enqueue(chunk)
        },
        flush: () => observer.finish(),
      })
    )
  }

  tapWritable(
    destination: WritableStream<Uint8Array>,
    direction: ProtocolDirection
  ): WritableStream<Uint8Array> {
    const writer = destination.getWriter()
    const observer = this.createObserver(direction)
    return new WritableStream<Uint8Array>({
      write: async chunk => {
        await writer.write(chunk)
        observer.push(chunk)
      },
      close: async () => {
        observer.finish()
        await writer.close()
      },
      abort: async reason => {
        observer.finish()
        await writer.abort(reason)
      },
    })
  }

  private createObserver(direction: ProtocolDirection): LineObserver {
    return new LineObserver(raw => {
      const sequence = this.options.sequence.next()
      const details = classify(raw)
      const frame: ProtocolTraceFrame = {
        id: `${this.options.runId}:trace:${sequence}`,
        runId: this.options.runId,
        connectionId: this.options.connectionId,
        sequence,
        timestamp: (this.options.now?.() ?? new Date()).toISOString(),
        protocolVersion: 'v1',
        direction,
        raw,
        byteLength: new TextEncoder().encode(raw).byteLength,
        ...details,
      }
      this.recordedFrames.push(frame)
      this.options.onFrame?.(frame)
    })
  }
}
