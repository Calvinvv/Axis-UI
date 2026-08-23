import { canonicalJson } from './canonical-json.js'
import { redactTranscriptDraft, type RedactionPolicy } from './redaction.js'
import { TranscriptReplay } from './replay.js'
import {
  AXIS_ACP_TRANSCRIPT_SCHEMA_VERSION,
  type AxisAcpTranscript,
  type TranscriptDraft,
} from './transcript.js'

export async function createTranscript(
  draft: TranscriptDraft,
  policy: RedactionPolicy = {}
): Promise<AxisAcpTranscript> {
  const redacted = redactTranscriptDraft(draft, policy)
  const placeholder: AxisAcpTranscript = {
    schemaVersion: AXIS_ACP_TRANSCRIPT_SCHEMA_VERSION,
    ...redacted.value,
    redactionManifest: redacted.manifest,
    integrity: {
      algorithm: 'SHA-256',
      stateHashes: {},
      eventCount: redacted.value.events.length,
      maxSequence: Math.max(
        0,
        ...redacted.value.events.map(event => event.sequence)
      ),
    },
  }
  const replay = new TranscriptReplay(placeholder)
  replay.playToEnd()
  return {
    ...placeholder,
    integrity: {
      ...placeholder.integrity,
      stateHashes: await replay.stateHashes(),
    },
  }
}

export function serializeTranscript(transcript: AxisAcpTranscript): string {
  return canonicalJson(transcript)
}
