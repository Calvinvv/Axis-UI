import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import VirtualList from '@packages/components/virtual-list'
import { virtualListProps } from '@packages/components/virtual-list/src/virtual-list'

// 测试真实的 VirtualList 组件（packages/components/virtual-list/src/virtual.tsx）。
// happy-dom 不做真实布局，但 scrollTop 可写、style 可读，
// 足以驱动"scrollTop -> 渲染窗口/偏移量"这条纯计算链路。
const createItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i, label: `Item ${i}` }))

const mountList = (items: unknown[], props: Record<string, unknown> = {}) =>
  mount(VirtualList, {
    props: { items, size: 32, remain: 8, ...props },
    slots: {
      // 作用域插槽契约：默认插槽以 { node } 形式拿到行数据
      default: (scope: { node: { label: string } }) =>
        h('div', { class: 'vl-item' }, scope.node.label),
    },
  })

const itemTexts = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.findAll('.vl-item').map(node => node.text())

describe('AxVirtualList', () => {
  it('初始只渲染可视区 + 后缓冲区，而非全部数据', () => {
    const wrapper = mountList(createItems(100))
    const texts = itemTexts(wrapper)

    // start=0 时无前缓冲，渲染 remain(8) + 后缓冲 min(remain, 剩余)=8 共 16 条
    expect(texts).toHaveLength(16)
    expect(texts[0]).toBe('Item 0')
    expect(texts.at(-1)).toBe('Item 15')
  })

  it('容器高度为 remain*size，滚动条占位高度为 items.length*size', () => {
    const wrapper = mountList(createItems(100))

    expect(wrapper.element.style.height).toBe('256px') // 8 * 32
    expect(
      (wrapper.find('.ax-vl__scroll-bar').element as HTMLElement).style.height
    ).toBe('3200px') // 100 * 32
  })

  it('滚动到中部时渲染三屏窗口，并用 translate3d 对齐偏移', async () => {
    const wrapper = mountList(createItems(100))

    // 滚过 10 行：start=10，前后缓冲各 8 -> 渲染 Item 2 ~ Item 25
    wrapper.element.scrollTop = 320
    await wrapper.trigger('scroll')

    const texts = itemTexts(wrapper)
    expect(texts).toHaveLength(24)
    expect(texts[0]).toBe('Item 2')
    expect(texts.at(-1)).toBe('Item 25')

    // 偏移量 = (start - prev) * size = (10 - 8) * 32
    expect(
      (wrapper.find('.ax-vl__scroll-list').element as HTMLElement).style
        .transform
    ).toBe('translate3d(0,64px,0)')
  })

  it('滚动到底部时不越界，渲染到最后一条为止', async () => {
    const wrapper = mountList(createItems(100))

    // 滚到最底：start=92，后缓冲为 0，前缓冲 8 -> Item 84 ~ Item 99
    wrapper.element.scrollTop = (100 - 8) * 32
    await wrapper.trigger('scroll')

    const texts = itemTexts(wrapper)
    expect(texts).toHaveLength(16)
    expect(texts[0]).toBe('Item 84')
    expect(texts.at(-1)).toBe('Item 99')
  })

  it('items 变化后重新计算滚动条占位高度', async () => {
    const wrapper = mountList(createItems(100))

    await wrapper.setProps({ items: createItems(50) })

    expect(
      (wrapper.find('.ax-vl__scroll-bar').element as HTMLElement).style.height
    ).toBe('1600px') // 50 * 32
  })

  it('scrollToIndex exposes generic index navigation with alignment', async () => {
    const wrapper = mountList(createItems(100))
    const component = wrapper.vm as unknown as {
      scrollToIndex: (
        index: number,
        alignment?: 'auto' | 'start' | 'center' | 'end'
      ) => void
    }

    component.scrollToIndex(50, 'center')
    await wrapper.vm.$nextTick()

    expect(wrapper.element.scrollTop).toBe(1488)
    expect(itemTexts(wrapper)).toContain('Item 50')

    component.scrollToIndex(500, 'end')
    await wrapper.vm.$nextTick()
    expect(wrapper.element.scrollTop).toBe((100 - 8) * 32)
    expect(itemTexts(wrapper).at(-1)).toBe('Item 99')
  })

  it('scrollToIndex auto keeps an already visible item stable', () => {
    const wrapper = mountList(createItems(100))
    const component = wrapper.vm as unknown as {
      scrollToIndex: (index: number) => void
    }

    component.scrollToIndex(4)

    expect(wrapper.element.scrollTop).toBe(0)
  })
})

// ========================================
// 动态高度 Props 定义测试
// ========================================
describe('VirtualList Props Definition', () => {
  it('virtualListProps includes estimatedSize', () => {
    expect(virtualListProps).toHaveProperty('estimatedSize')
  })

  it('estimatedSize defaults to 0', () => {
    expect(virtualListProps.estimatedSize.default).toBe(0)
  })

  it('size defaults to 0 (dynamic mode preparation)', () => {
    expect(virtualListProps.size.default).toBe(0)
  })
})

// ========================================
// 动态高度模式 — 真实组件测试
// ========================================
describe('AxVirtualList Dynamic Height Mode', () => {
  // 动态高度模式下使用 estimatedSize 计算容器和滚动条高度
  it('uses estimatedSize for scroll bar height when size is 0', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(100)
    const wrapper = mount(_VirtualList, {
      props: { items, estimatedSize: 40, remain: 8 },
    })

    // 滚动条高度应为 items.length * estimatedSize
    const scrollBar = wrapper.find('.ax-vl__scroll-bar')
    expect(scrollBar.exists()).toBe(true)
    expect((scrollBar.element as HTMLElement).style.height).toBe(
      `${100 * 40}px`
    )
  })

  it('uses size for scroll bar height in fixed mode (backward compat)', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(100)
    const wrapper = mount(_VirtualList, {
      props: { items, size: 32, remain: 8 },
    })

    const scrollBar = wrapper.find('.ax-vl__scroll-bar')
    expect((scrollBar.element as HTMLElement).style.height).toBe(
      `${100 * 32}px`
    )
  })

  it('renders visible items in dynamic mode', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(100)
    const wrapper = mount(_VirtualList, {
      props: { items, estimatedSize: 40, remain: 5 },
      slots: {
        default: (slotProps: { node: { label: string } }) =>
          h('div', { class: 'item' }, slotProps.node.label),
      },
    })

    // 应该渲染 remain + buffer 个项（不超过总数）
    const renderedItems = wrapper.findAll('.item')
    expect(renderedItems.length).toBeGreaterThan(0)
    expect(renderedItems.length).toBeLessThanOrEqual(items.length)
  })

  it('wraps items with data-virtual-index in dynamic mode', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(20)
    const wrapper = mount(_VirtualList, {
      props: { items, estimatedSize: 40, remain: 5 },
      slots: {
        default: (slotProps: { node: { label: string } }) =>
          h('div', { class: 'item' }, slotProps.node.label),
      },
    })

    // 动态模式下每个可见项应该有 data-virtual-index 属性
    const indexedItems = wrapper.findAll('[data-virtual-index]')
    expect(indexedItems.length).toBeGreaterThan(0)
    // 第一项的 index 应该是 0
    expect(indexedItems[0].attributes('data-virtual-index')).toBe('0')
  })

  it('does NOT wrap items with data-virtual-index in fixed mode', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(20)
    const wrapper = mount(_VirtualList, {
      props: { items, size: 32, remain: 5 },
      slots: {
        default: (slotProps: { node: { label: string } }) =>
          h('div', { class: 'item' }, slotProps.node.label),
      },
    })

    // 固定模式下不应有 data-virtual-index wrapper
    const indexedItems = wrapper.findAll('[data-virtual-index]')
    expect(indexedItems.length).toBe(0)
  })

  it('sets container height based on remain * estimatedSize', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(50)
    const wrapper = mount(_VirtualList, {
      props: { items, estimatedSize: 60, remain: 10 },
    })

    // 容器高度 = remain * estimatedSize = 10 * 60 = 600px
    const container = wrapper.find('.ax-vl')
    expect((container.element as HTMLElement).style.height).toBe('600px')
  })

  it('sets container height based on remain * size in fixed mode', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(50)
    const wrapper = mount(_VirtualList, {
      props: { items, size: 32, remain: 10 },
    })

    // 容器高度 = remain * size = 10 * 32 = 320px
    const container = wrapper.find('.ax-vl')
    expect((container.element as HTMLElement).style.height).toBe('320px')
  })

  it('cleans up stale cache entries when items shrink', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(50)
    const wrapper = mount(_VirtualList, {
      props: { items, estimatedSize: 40, remain: 5 },
    })

    // 滚动条高度应该是 50 * 40 = 2000
    const scrollBar = wrapper.find('.ax-vl__scroll-bar')
    expect((scrollBar.element as HTMLElement).style.height).toBe('2000px')

    // 缩小 items
    await wrapper.setProps({ items: createItems(20) })

    // 滚动条高度应该更新为 20 * 40 = 800
    expect((scrollBar.element as HTMLElement).style.height).toBe('800px')
  })

  it('falls back to 32 when both size and estimatedSize are 0', async () => {
    const { mount } = await import('@vue/test-utils')
    const _VirtualList = (
      await import('@packages/components/virtual-list/src/virtual')
    ).default

    const items = createItems(10)
    const wrapper = mount(_VirtualList, {
      props: { items, remain: 5 },
    })

    // 默认 fallback: 5 * 32 = 160
    const container = wrapper.find('.ax-vl')
    expect((container.element as HTMLElement).style.height).toBe('160px')

    // 滚动条高度: 10 * 32 = 320
    const scrollBar = wrapper.find('.ax-vl__scroll-bar')
    expect((scrollBar.element as HTMLElement).style.height).toBe('320px')
  })
})
