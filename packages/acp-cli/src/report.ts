import type { ScenarioReport } from '@axis-ui/acp-harness'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function json(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2))
}

export function renderScenarioReport(
  report: ScenarioReport,
  transcriptFileName: string
): string {
  const diagnostics = report.diagnostics
    .map(
      item => `<tr>
        <td><span class="severity severity-${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span></td>
        <td>${escapeHtml(item.kind)}</td>
        <td>${escapeHtml(item.subject)}</td>
        <td><code>${escapeHtml(item.invariantId)}</code></td>
        <td>${escapeHtml(item.message)}</td>
      </tr>`
    )
    .join('')
  const assertions = report.assertions
    .map(
      assertion => `<li class="assertion ${assertion.passed ? 'passed' : 'failed'}">
        <strong>${assertion.passed ? 'PASS' : 'FAIL'}</strong>
        <code>${escapeHtml(assertion.id)}</code>
        <span>${escapeHtml(assertion.message)}</span>
      </li>`
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Axis ACP Report · ${escapeHtml(report.scenarioId)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; line-height: 1.5; }
    main { max-width: 1180px; margin: 0 auto; }
    header, section { border: 1px solid #334155; background: #111c31; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    h1, h2 { margin-top: 0; }
    .eyebrow { color: #93c5fd; font: 600 12px/1.4 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-weight: 700; background: ${report.status === 'passed' ? '#14532d' : '#7f1d1d'}; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .metric { border: 1px solid #334155; border-radius: 8px; padding: 14px; }
    .metric span { display: block; color: #94a3b8; font-size: 12px; }
    .metric strong { font: 700 24px/1.3 ui-monospace, monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #334155; padding: 10px; text-align: left; vertical-align: top; }
    th { color: #94a3b8; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { overflow: auto; background: #020617; padding: 14px; border-radius: 8px; }
    .assertion { display: grid; grid-template-columns: 54px minmax(180px, auto) 1fr; gap: 12px; padding: 8px 0; }
    .passed strong { color: #86efac; } .failed strong, .severity-error, .severity-fatal { color: #fca5a5; }
    a { color: #93c5fd; }
    .notice { border-left: 3px solid #f59e0b; color: #fde68a; padding-left: 12px; }
    @media (max-width: 700px) { body { padding: 16px; } .assertion { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
<main>
  <header>
    <div class="eyebrow">Axis ACP DevKit · Single Run</div>
    <h1>${escapeHtml(report.scenarioId)}</h1>
    <p><span class="status">${escapeHtml(report.status.toUpperCase())}</span></p>
    <p class="notice">This is an Axis scenario result, not official ACP certification.</p>
    <a href="${escapeHtml(transcriptFileName)}">Download redacted transcript</a>
  </header>
  <section>
    <h2>Run evidence</h2>
    <div class="metrics">
      <div class="metric"><span>Raw frames</span><strong>${report.traceCount}</strong></div>
      <div class="metric"><span>Semantic events</span><strong>${report.eventCount}</strong></div>
      <div class="metric"><span>Diagnostics</span><strong>${report.diagnostics.length}</strong></div>
      <div class="metric"><span>State snapshots</span><strong>${report.stateSnapshots.length}</strong></div>
    </div>
  </section>
  <section>
    <h2>Assertions</h2>
    <ul>${assertions}</ul>
  </section>
  <section>
    <h2>Diagnostics</h2>
    ${diagnostics.length === 0 ? '<p>No diagnostics.</p>' : `<table><thead><tr><th>Severity</th><th>Kind</th><th>Subject</th><th>Invariant</th><th>Message</th></tr></thead><tbody>${diagnostics}</tbody></table>`}
  </section>
  <section>
    <h2>Client profile</h2>
    <pre>${json(report.profile)}</pre>
  </section>
  <section>
    <h2>State hashes</h2>
    <pre>${json(report.transcript.integrity.stateHashes)}</pre>
  </section>
</main>
</body>
</html>`
}
