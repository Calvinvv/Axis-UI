<script setup lang="ts">
import {
  parseTranscript,
  serializeTranscript,
  TranscriptReplay,
  type ProtocolTraceFrame,
} from '@axis-ui/acp-core'
import {
  Button as AxButton,
  Form as AxForm,
  Input as AxInput,
  Tree as AxTree,
  VirtualList as AxVirtualList,
  type VirtualListExpose,
} from 'axis-ui'
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { runBridgeScenario } from './bridge-client.js'
import { loadDemoRuns, type DevToolsRun } from './demo-data.js'

interface TimelineRow {
  readonly id: string
  readonly sequence: number
  readonly lane: 'wire' | 'event'
  readonly kind: string
  readonly method?: string
  readonly summary: string
  readonly source: unknown
}

const runs = shallowRef<DevToolsRun[]>([])
const selectedRunId = ref('')
const selectedRowId = ref('')
const search = ref('')
const loading = ref(true)
const running = ref(false)
const statusMessage = ref('Loading deterministic samples…')
const errorMessage = ref('')
const timelineRef = ref<VirtualListExpose>()
const fileInput = ref<HTMLInputElement>()

const launcher = reactive({
  targetId: 'fixture-agent',
  scenarioId: 'cancel-during-permission',
  workspaceRoot: '',
  bridgeUrl: '',
  bridgeToken: '',
})

const selectedRun = computed(() =>
  runs.value.find(run => run.id === selectedRunId.value)
)
const transcript = computed(() => selectedRun.value?.transcript)
const timeline = computed<TimelineRow[]>(() => {
  const current = transcript.value
  if (current === undefined) return []
  const rows: TimelineRow[] = [
    ...current.rawFrames.map(frame => ({
      id: frame.id,
      sequence: frame.sequence,
      lane: 'wire' as const,
      kind: frame.kind,
      method: frame.method,
      summary: frame.method ?? `${frame.direction} ${frame.kind}`,
      source: frame,
    })),
    ...current.events.map(event => ({
      id: event.id,
      sequence: event.sequence,
      lane: 'event' as const,
      kind: event.type,
      summary:
        event.type === 'session/state-changed'
          ? `Session → ${event.state}`
          : event.type,
      source: event,
    })),
  ].sort((left, right) => left.sequence - right.sequence)
  const query = search.value.trim().toLowerCase()
  return query.length === 0
    ? rows
    : rows.filter(row =>
        `${row.sequence} ${row.lane} ${row.kind} ${row.method ?? ''} ${row.summary}`
          .toLowerCase()
          .includes(query)
      )
})
const selectedRow = computed(
  () =>
    timeline.value.find(row => row.id === selectedRowId.value) ??
    timeline.value[0]
)
const selectedRawFrame = computed<ProtocolTraceFrame | undefined>(() => {
  const current = transcript.value
  const row = selectedRow.value
  if (current === undefined || row === undefined) return undefined
  if (row.lane === 'wire') return row.source as ProtocolTraceFrame
  const event = current.events.find(item => item.id === row.id)
  const firstTraceId = event?.sourceTraceIds[0]
  return current.rawFrames.find(frame => frame.id === firstTraceId)
})
const stateAtSelection = computed(() => {
  const current = transcript.value
  if (current === undefined) return {}
  const replay = new TranscriptReplay(current)
  return replay.seek(selectedRow.value?.sequence ?? Number.MAX_SAFE_INTEGER)
    .states
})
const capabilityTree = computed(() => {
  const capability = transcript.value?.events.find(
    event => event.type === 'capability/snapshot'
  )
  return toTree(
    capability?.agentCapabilities ?? {},
    'agent-capabilities',
    'Agent capabilities'
  )
})
const diagnostics = computed(() => transcript.value?.diagnostics ?? [])
const assertionsPassed = computed(
  () => transcript.value?.assertions.filter(item => item.passed).length ?? 0
)
const bridgeConfigured = computed(
  () => launcher.bridgeUrl.length > 0 && launcher.bridgeToken.length > 0
)

watch(
  () => launcher.targetId,
  targetId => {
    if (targetId === 'opencode') launcher.scenarioId = 'normal-prompt-turn'
  }
)

onMounted(async () => {
  const query = new URLSearchParams(window.location.search)
  launcher.bridgeUrl = query.get('bridge') ?? ''
  launcher.bridgeToken = query.get('token') ?? ''
  launcher.workspaceRoot = query.get('workspace') ?? ''
  runs.value = [...(await loadDemoRuns())]
  selectedRunId.value = runs.value[0]?.id ?? ''
  selectFirstRow()
  loading.value = false
  statusMessage.value = 'Three deterministic scenario samples are ready.'
})

function selectRun(runId: string): void {
  selectedRunId.value = runId
  search.value = ''
  void nextTick(selectFirstRow)
}

function selectFirstRow(): void {
  selectedRowId.value = timeline.value[0]?.id ?? ''
}

function selectRow(row: TimelineRow): void {
  selectedRowId.value = row.id
}

async function revealSequence(sequence: number | undefined): Promise<void> {
  if (sequence === undefined) return
  search.value = ''
  await nextTick()
  const index = timeline.value.findIndex(row => row.sequence === sequence)
  if (index < 0) return
  selectedRowId.value = timeline.value[index]?.id ?? ''
  const list = timelineRef.value as
    | (VirtualListExpose & { $?: { exposed?: VirtualListExpose } })
    | undefined
  const scrollToIndex = list?.scrollToIndex ?? list?.$?.exposed?.scrollToIndex
  scrollToIndex?.(index, 'center')
}

async function runLiveScenario(): Promise<void> {
  if (!bridgeConfigured.value || launcher.workspaceRoot.length === 0) {
    errorMessage.value =
      'Start axis-acp serve, open its authenticated URL, and provide a workspace.'
    return
  }
  running.value = true
  errorMessage.value = ''
  statusMessage.value = `Running ${launcher.scenarioId}…`
  try {
    const report = await runBridgeScenario({
      bridgeUrl: launcher.bridgeUrl,
      token: launcher.bridgeToken,
      targetId: launcher.targetId,
      scenarioId: launcher.scenarioId,
      workspaceRoot: launcher.workspaceRoot,
    })
    const run: DevToolsRun = {
      id: report.runId,
      status: report.status,
      source: 'bridge',
      transcript: parseTranscript(report.transcript),
    }
    runs.value = [run, ...runs.value]
    selectRun(run.id)
    statusMessage.value = `${report.scenarioId} finished: ${report.status}.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
    statusMessage.value = 'Scenario run failed.'
  } finally {
    running.value = false
  }
}

function requestImport(): void {
  fileInput.value?.click()
}

async function importTranscript(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file === undefined) return
  errorMessage.value = ''
  try {
    const imported = parseTranscript(await file.text())
    const replay = new TranscriptReplay(imported)
    replay.playToEnd()
    if (!(await replay.verifyIntegrity())) {
      throw new Error('Transcript state hash verification failed')
    }
    const run: DevToolsRun = {
      id: `import-${imported.run.id}`,
      status: imported.diagnostics.some(item => item.severity === 'fatal')
        ? 'failed'
        : 'passed',
      source: 'import',
      transcript: imported,
    }
    runs.value = [run, ...runs.value]
    selectRun(run.id)
    statusMessage.value = `Imported ${file.name}; state hash verified.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    input.value = ''
  }
}

function downloadTranscript(): void {
  const current = transcript.value
  if (current === undefined) return
  const blob = new Blob([serializeTranscript(current)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${current.run.id}.axis-acp.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function toTree(
  value: unknown,
  key: string,
  label: string
): Array<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null) {
    return [{ key, label: `${label}: ${String(value)}`, isLeaf: true }]
  }
  return [
    {
      key,
      label,
      children: Object.entries(value).flatMap(([childKey, childValue]) =>
        toTree(childValue, `${key}.${childKey}`, childKey)
      ),
    },
  ]
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <main class="devtools" data-product="axis-acp-devtools">
    <a class="skip-link" href="#protocol-timeline">Skip to protocol timeline</a>
    <header class="topbar">
      <div class="brand-lockup">
        <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 29 20 7l12 22h-7l-5-10-5 10H8Z" />
          <circle cx="20" cy="29" r="3" />
        </svg>
        <div>
          <p class="eyebrow">ACP developer toolkit</p>
          <h1>Axis Protocol Workbench</h1>
        </div>
      </div>
      <div class="topbar-actions">
        <span class="connection" :class="{ online: bridgeConfigured }">
          <span class="status-dot" aria-hidden="true"></span>
          {{ bridgeConfigured ? 'Local bridge configured' : 'Artifact mode' }}
        </span>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import ACP transcript"
          @change="importTranscript"
        />
        <AxButton size="small" @click="requestImport"
          >Import transcript</AxButton
        >
        <AxButton size="small" type="primary" @click="downloadTranscript">
          Export JSON
        </AxButton>
      </div>
    </header>

    <section class="metric-strip" aria-label="Selected run metrics">
      <div class="metric">
        <span>Run status</span><strong>{{ selectedRun?.status ?? '—' }}</strong>
      </div>
      <div class="metric">
        <span>Raw frames</span
        ><strong>{{ transcript?.rawFrames.length ?? 0 }}</strong>
      </div>
      <div class="metric">
        <span>Events</span><strong>{{ transcript?.events.length ?? 0 }}</strong>
      </div>
      <div class="metric">
        <span>Assertions</span
        ><strong
          >{{ assertionsPassed }}/{{
            transcript?.assertions.length ?? 0
          }}</strong
        >
      </div>
      <div class="metric">
        <span>Diagnostics</span><strong>{{ diagnostics.length }}</strong>
      </div>
    </section>

    <section v-if="loading" class="loading-state" aria-live="polite">
      Loading replay-safe samples…
    </section>

    <div v-else class="workspace-grid">
      <aside class="left-rail" aria-label="Runs and launcher">
        <section class="panel launcher-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Control</p>
              <h2>Run scenario</h2>
            </div>
            <span class="mode-badge">{{
              bridgeConfigured ? 'LIVE' : 'SETUP'
            }}</span>
          </div>
          <AxForm :model="launcher" class="launch-form">
            <div class="field">
              <label for="target-select">Target</label>
              <select id="target-select" v-model="launcher.targetId">
                <option value="fixture-agent">Deterministic fixture</option>
                <option value="opencode">OpenCode (real agent)</option>
              </select>
            </div>
            <div class="field">
              <label for="scenario-select">Scenario</label>
              <select id="scenario-select" v-model="launcher.scenarioId">
                <option value="normal-prompt-turn">normal-prompt-turn</option>
                <option
                  value="cancel-during-permission"
                  :disabled="launcher.targetId === 'opencode'"
                >
                  cancel-during-permission
                </option>
                <option
                  value="capability-method-mismatch"
                  :disabled="launcher.targetId === 'opencode'"
                >
                  capability-method-mismatch
                </option>
              </select>
            </div>
            <div class="field">
              <label for="workspace-root">Workspace root</label>
              <AxInput
                id="workspace-root"
                v-model="launcher.workspaceRoot"
                placeholder="/absolute/allowed/workspace"
              />
            </div>
            <AxButton
              type="primary"
              size="large"
              :loading="running"
              :disabled="!bridgeConfigured"
              @click="runLiveScenario"
            >
              {{ running ? 'Running scenario' : 'Run through bridge' }}
            </AxButton>
          </AxForm>
          <p class="helper">
            Browser sends only registered Target and Scenario IDs. Commands and
            arguments stay on the Node host.
          </p>
          <p v-if="errorMessage" class="error-message" role="alert">
            {{ errorMessage }}
          </p>
          <p class="status-message" aria-live="polite">{{ statusMessage }}</p>
        </section>

        <section class="panel runs-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Evidence</p>
              <h2>Runs</h2>
            </div>
            <span>{{ runs.length }}</span>
          </div>
          <div class="run-list" role="list">
            <button
              v-for="run in runs"
              :key="run.id"
              class="run-card"
              :class="{ selected: run.id === selectedRunId }"
              :aria-pressed="run.id === selectedRunId"
              :data-scenario="run.transcript.run.scenarioId"
              type="button"
              @click="selectRun(run.id)"
            >
              <span class="run-status" :class="run.status">{{
                run.status
              }}</span>
              <strong>{{ run.transcript.run.scenarioId }}</strong>
              <small>{{ run.transcript.target.id }} · {{ run.source }}</small>
            </button>
          </div>
        </section>
      </aside>

      <section
        id="protocol-timeline"
        class="panel timeline-panel"
        tabindex="-1"
      >
        <div class="panel-heading timeline-heading">
          <div>
            <p class="eyebrow">Sequence ledger</p>
            <h2>Protocol timeline</h2>
          </div>
          <span class="sequence-readout"
            >SEQ {{ selectedRow?.sequence ?? 0 }}</span
          >
        </div>
        <label class="search-label" for="trace-search">Filter timeline</label>
        <AxInput
          id="trace-search"
          v-model="search"
          clearable
          placeholder="Method, event, direction, sequence…"
        />
        <div class="lane-legend" aria-label="Timeline lanes">
          <span><i class="lane-dot wire"></i>Raw wire</span>
          <span><i class="lane-dot event"></i>Semantic event</span>
        </div>
        <AxVirtualList
          ref="timelineRef"
          class="timeline-list"
          :items="timeline"
          :size="48"
          :remain="11"
        >
          <template #default="{ node }">
            <button
              class="timeline-row"
              :class="[
                `lane-${node.lane}`,
                { selected: node.id === selectedRow?.id },
              ]"
              :aria-pressed="node.id === selectedRow?.id"
              type="button"
              @click="selectRow(node)"
            >
              <span class="sequence">{{
                String(node.sequence).padStart(3, '0')
              }}</span>
              <span class="lane">{{ node.lane }}</span>
              <span class="row-summary"
                ><strong>{{ node.summary }}</strong
                ><small>{{ node.kind }}</small></span
              >
            </button>
          </template>
        </AxVirtualList>
        <div v-if="timeline.length === 0" class="empty-state">
          No entries match this filter.
        </div>
      </section>

      <aside class="right-rail" aria-label="Evidence inspector">
        <section class="panel inspector-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Selected evidence</p>
              <h2>Inspector</h2>
            </div>
            <span class="mode-badge">READ ONLY</span>
          </div>
          <div class="inspector-section">
            <h3>Raw JSON</h3>
            <pre data-testid="raw-json">{{
              formatJson(selectedRawFrame?.parsed ?? selectedRow?.source ?? {})
            }}</pre>
          </div>
          <div class="inspector-section">
            <h3>State at sequence</h3>
            <pre data-testid="state-json">{{
              formatJson(stateAtSelection)
            }}</pre>
          </div>
        </section>

        <section class="panel capability-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Negotiated</p>
              <h2>Capabilities</h2>
            </div>
          </div>
          <AxTree
            :data="capabilityTree"
            :default-expanded-keys="['agent-capabilities']"
            :selectable="false"
          />
        </section>

        <section class="panel diagnostics-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Findings</p>
              <h2>Diagnostics</h2>
            </div>
            <span>{{ diagnostics.length }}</span>
          </div>
          <p v-if="diagnostics.length === 0" class="empty-copy">
            No diagnostics for this run.
          </p>
          <button
            v-for="diagnostic in diagnostics"
            :key="diagnostic.id"
            class="diagnostic-card"
            type="button"
            @click="revealSequence(diagnostic.sequence)"
          >
            <span class="diagnostic-meta"
              >{{ diagnostic.severity }} · {{ diagnostic.subject }}</span
            >
            <strong>{{ diagnostic.invariantId }}</strong>
            <span>{{ diagnostic.message }}</span>
            <small>Reveal sequence {{ diagnostic.sequence ?? 'n/a' }}</small>
          </button>
        </section>
      </aside>
    </div>

    <footer>
      <span>Axis scenario evidence is not official ACP certification.</span>
      <span>Replay never re-executes Agent or Tool side effects.</span>
    </footer>
  </main>
</template>

<style src="./styles.css"></style>
