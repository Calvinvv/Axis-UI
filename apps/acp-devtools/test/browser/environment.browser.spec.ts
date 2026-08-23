import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import App from '../../src/App.vue'

describe('ACP DevTools real browser boundary', () => {
  it('mounts the responsive timeline and replay inspector in Chromium', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.findAll('.timeline-row').length).toBeGreaterThan(0)
    )

    expect(wrapper.get('h1').text()).toBe('Axis Protocol Workbench')
    expect(wrapper.findAll('.timeline-row').length).toBeGreaterThan(0)
    await wrapper.findAll('.timeline-row').at(-1)?.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="state-json"]').text()).toContain(
      'session'
    )
    expect(
      Number.parseFloat(
        getComputedStyle(wrapper.get('.devtools').element).minHeight
      )
    ).toBeGreaterThanOrEqual(window.innerHeight)
    wrapper.unmount()
  })
})
