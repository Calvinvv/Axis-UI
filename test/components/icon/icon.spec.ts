import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AxIcon from '@packages/components/icon/src/icon.vue'

describe('AxIcon', () => {
  // 测试组件是否正常渲染
  it('renders correctly', () => {
    const wrapper = mount(AxIcon)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('i').exists()).toBe(true)
  })

  // 测试插槽内容
  it('renders slot content', () => {
    const wrapper = mount(AxIcon, {
      slots: {
        default: 'test-icon',
      },
    })
    expect(wrapper.text()).toBe('test-icon')
  })

  // 测试size属性
  it('applies size prop correctly', () => {
    const wrapper = mount(AxIcon, {
      props: { size: 24 },
    })
    const iconElement = wrapper.find('i')
    expect(iconElement.attributes('style')).toContain('font-size: 24px')
  })

  // 测试color属性
  it('applies color prop correctly', () => {
    const wrapper = mount(AxIcon, {
      props: { color: 'red' },
    })
    const iconElement = wrapper.find('i')
    expect(iconElement.attributes('style')).toContain('color: red')
  })

  // 测试size和color同时存在
  it('applies both size and color props', () => {
    const wrapper = mount(AxIcon, {
      props: { size: 32, color: 'blue' },
    })
    const iconElement = wrapper.find('i')
    const style = iconElement.attributes('style')
    expect(style).toContain('font-size: 32px')
    expect(style).toContain('color: blue')
  })

  // 测试无props时无内联样式
  it('has no inline styles when no props provided', () => {
    const wrapper = mount(AxIcon)
    const iconElement = wrapper.find('i')
    expect(iconElement.attributes('style')).toBeUndefined()
  })

  // 测试组件名称
  it('has correct component name', () => {
    const wrapper = mount(AxIcon)
    expect(wrapper.vm.$options.name).toBe('AxIcon')
  })

  // 测试响应式更新
  it('updates style when props change', async () => {
    const wrapper = mount(AxIcon, {
      props: { size: 16 },
    })

    expect(wrapper.find('i').attributes('style')).toContain('font-size: 16px')

    await wrapper.setProps({ size: 48 })
    expect(wrapper.find('i').attributes('style')).toContain('font-size: 48px')
  })
})
