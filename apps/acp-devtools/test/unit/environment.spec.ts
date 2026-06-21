import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import App from '../../src/App.vue'
import { runBridgeScenario } from '../../src/bridge-client.js'

describe('ACP DevTools workbench', () => {
  it('renders three scenario artifacts with real Axis-UI components', async () => {
    const wrapper = mount(App)
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.findAll('.run-card')).toHaveLength(3))

    expect(
      wrapper
        .get('[data-product="axis-acp-devtools"]')
        .attributes('data-product')
    ).toBe('axis-acp-devtools')
    expect(
      wrapper
        .findAll('[data-scenario]')
        .map(node => node.attributes('data-scenario'))
    ).toEqual([
      'normal-prompt-turn',
      'cancel-during-permission',
      'capability-method-mismatch',
    ])
    expect(wrapper.find('.ax-form').exists()).toBe(true)
    expect(wrapper.find('.ax-vl').exists()).toBe(true)
    expect(wrapper.find('.ax-tree').exists()).toBe(true)
  })

  it('maps a diagnostic sequence to a generic virtual-list index', async () => {
    const wrapper = mount(App)
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.findAll('.run-card')).toHaveLength(3))
    await wrapper
      .get('[data-scenario="capability-method-mismatch"]')
      .trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.diagnostic-card').text()).toContain(
      'omitted-capability-is-unsupported'
    )
    await wrapper.get('.diagnostic-card').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.sequence-readout').text()).toBe('SEQ 9')
    expect(wrapper.get('[data-testid="raw-json"]').text()).toContain(
      'terminal/create'
    )
  })

  it('converges the real agent launcher to its supported scenario', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('#scenario-select').setValue('cancel-during-permission')
    await wrapper.get('#target-select').setValue('opencode')
    await wrapper.vm.$nextTick()

    expect(
      (wrapper.get('#scenario-select').element as HTMLSelectElement).value
    ).toBe('normal-prompt-turn')
  })

  it('refuses a non-loopback bridge URL before opening a socket', async () => {
    await expect(
      runBridgeScenario({
        bridgeUrl: 'wss://remote.example/collect',
        token: 'not-a-real-token',
        targetId: 'fixture-agent',
        scenarioId: 'normal-prompt-turn',
        workspaceRoot: '/private/workspace',
      })
    ).rejects.toThrow('must use ws:// on loopback')
  })
})
