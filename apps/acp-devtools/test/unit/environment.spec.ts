import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from '../../src/App.vue'

describe('ACP DevTools happy-dom project boundary', () => {
  it('type-checks and mounts the Vue skeleton separately from Node packages', () => {
    const wrapper = mount(App)

    expect(wrapper.attributes('data-gate')).toBe('01')
  })
})
