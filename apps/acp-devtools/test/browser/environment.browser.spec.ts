import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from '../../src/App.vue'

describe('ACP DevTools browser project boundary', () => {
  it('runs the Vue skeleton in a real browser project', () => {
    const wrapper = mount(App)

    expect(wrapper.get('[data-gate="01"]').text()).toContain(
      'no ACP runtime is implemented'
    )
  })
})
