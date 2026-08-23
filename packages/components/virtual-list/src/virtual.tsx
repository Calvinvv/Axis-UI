import { createNamespace } from '@axis-ui/utils'
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { virtualListProps, type VirtualListAlignment } from './virtual-list'

export default defineComponent({
  name: 'AxVirtualList',
  props: virtualListProps,
  setup(props, { slots, expose }) {
    const bem = createNamespace('vl')
    const wrapperRef = ref<HTMLElement>()
    const barRef = ref<HTMLElement>()
    const listRef = ref<HTMLElement>()

    // ========================================
    // 模式判断
    // ========================================
    const isFixedMode = computed(() => props.size > 0)
    const itemSize = computed(() =>
      props.size > 0
        ? props.size
        : props.estimatedSize > 0
          ? props.estimatedSize
          : 32
    )

    // ========================================
    // 高度缓存（动态模式专用）
    // ========================================
    const measuredHeights = new Map<number, number>()

    function getItemHeight(index: number): number {
      if (isFixedMode.value) return props.size
      return measuredHeights.get(index) ?? itemSize.value
    }

    function getItemOffset(index: number): number {
      if (isFixedMode.value) return index * props.size
      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i)
      }
      return offset
    }

    function getTotalHeight(): number {
      if (isFixedMode.value) return props.items.length * props.size
      let total = 0
      for (let i = 0; i < props.items.length; i++) {
        total += getItemHeight(i)
      }
      return total
    }

    // 二分查找：给定 scrollTop，找到第一个可见项的 index
    function findStartIndex(scrollTop: number): number {
      if (isFixedMode.value) return Math.floor(scrollTop / props.size)

      let low = 0
      let high = props.items.length - 1
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const offset = getItemOffset(mid)
        const height = getItemHeight(mid)
        if (offset + height <= scrollTop) {
          low = mid + 1
        } else if (offset > scrollTop) {
          high = mid - 1
        } else {
          return mid
        }
      }
      return low
    }

    // ========================================
    // 滚动状态
    // ========================================
    const state = reactive({
      start: 0,
      end: props.remain,
    })

    const prev = computed(() => Math.min(props.remain, state.start))
    const next = computed(() =>
      Math.min(props.remain, props.items.length - state.end)
    )

    const visibleData = computed(() =>
      props.items.slice(state.start - prev.value, state.end + next.value)
    )

    const offsetY = ref(0)

    function handleScroll() {
      const scrollTop = wrapperRef.value!.scrollTop

      if (isFixedMode.value) {
        // 固定高度：原有逻辑
        state.start = Math.floor(scrollTop / props.size)
        state.end = state.start + props.remain
        offsetY.value = state.start * props.size - props.size * prev.value
      } else {
        // 动态高度：二分查找定位
        state.start = findStartIndex(scrollTop)

        // 从 start 开始累加高度，找到 end
        let accHeight = 0
        const containerHeight = props.remain * itemSize.value
        let end = state.start
        while (end < props.items.length && accHeight < containerHeight) {
          accHeight += getItemHeight(end)
          end++
        }
        state.end = end

        // 计算偏移
        const renderStart = state.start - prev.value
        offsetY.value = getItemOffset(Math.max(0, renderStart))
      }
    }

    function scrollToIndex(
      requestedIndex: number,
      alignment: VirtualListAlignment = 'auto'
    ): void {
      const wrapper = wrapperRef.value
      if (!wrapper || props.items.length === 0) return
      const index = Math.min(
        props.items.length - 1,
        Math.max(0, Math.trunc(requestedIndex))
      )
      const itemTop = getItemOffset(index)
      const itemBottom = itemTop + getItemHeight(index)
      const viewportHeight = props.remain * itemSize.value
      const viewportTop = wrapper.scrollTop
      const viewportBottom = viewportTop + viewportHeight
      let nextScrollTop = itemTop

      if (alignment === 'auto') {
        if (itemTop >= viewportTop && itemBottom <= viewportBottom) return
        nextScrollTop =
          itemTop < viewportTop ? itemTop : itemBottom - viewportHeight
      } else if (alignment === 'center') {
        nextScrollTop = itemTop - (viewportHeight - getItemHeight(index)) / 2
      } else if (alignment === 'end') {
        nextScrollTop = itemBottom - viewportHeight
      }

      wrapper.scrollTop = Math.min(
        Math.max(0, getTotalHeight() - viewportHeight),
        Math.max(0, nextScrollTop)
      )
      handleScroll()
    }

    expose({ scrollToIndex })

    // ========================================
    // 容器初始化
    // ========================================
    function initWrapper() {
      if (!wrapperRef.value || !barRef.value) return

      if (isFixedMode.value) {
        wrapperRef.value.style.height = props.remain * props.size + 'px'
        barRef.value.style.height = props.items.length * props.size + 'px'
      } else {
        wrapperRef.value.style.height = props.remain * itemSize.value + 'px'
        barRef.value.style.height = getTotalHeight() + 'px'
      }
    }

    watch(
      () => props.items,
      () => {
        // 清理过期缓存
        if (!isFixedMode.value) {
          // 删除超出新长度的缓存
          for (const key of measuredHeights.keys()) {
            if (key >= props.items.length) {
              measuredHeights.delete(key)
            }
          }
        }
        initWrapper()
      }
    )

    watch(() => [props.size, props.estimatedSize, props.remain], initWrapper)

    onMounted(() => {
      initWrapper()
      if (!isFixedMode.value) {
        setupResizeObserver()
      }
    })

    // ========================================
    // ResizeObserver（动态模式）
    // ========================================
    let resizeObserver: ResizeObserver | null = null

    function updateMeasuredHeight(index: number, height: number) {
      const prev = measuredHeights.get(index)
      if (prev !== height) {
        measuredHeights.set(index, height)
        // 更新滚动条总高度
        if (barRef.value) {
          barRef.value.style.height = getTotalHeight() + 'px'
        }
      }
    }

    function setupResizeObserver() {
      if (typeof ResizeObserver === 'undefined') return

      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const indexStr = el.dataset.virtualIndex
          if (indexStr != null) {
            const index = Number(indexStr)
            const height = el.getBoundingClientRect().height
            if (height > 0) {
              updateMeasuredHeight(index, height)
            }
          }
        }
      })

      observeVisibleItems()
    }

    function observeVisibleItems() {
      if (!resizeObserver || !listRef.value) return

      // 先断开所有观察
      resizeObserver.disconnect()

      // 观察当前可见的项
      const items = listRef.value.querySelectorAll('[data-virtual-index]')
      items.forEach(el => resizeObserver!.observe(el))
    }

    // 当可见数据变化时重新观察
    watch(visibleData, () => {
      if (!isFixedMode.value) {
        // nextTick 后才能拿到新 DOM
        requestAnimationFrame(() => {
          observeVisibleItems()
        })
      }
    })

    onUnmounted(() => {
      resizeObserver?.disconnect()
      resizeObserver = null
    })

    // ========================================
    // 渲染
    // ========================================

    // 计算 visibleData 中每项在原始数组中的索引
    const visibleStartIndex = computed(() => state.start - prev.value)

    return () => {
      return (
        <div class={bem.b()} ref={wrapperRef} onScroll={handleScroll}>
          <div class={bem.e('scroll-bar')} ref={barRef}></div>
          <div
            class={bem.e('scroll-list')}
            ref={listRef}
            style={{ transform: `translate3d(0,${offsetY.value}px,0)` }}
          >
            {visibleData.value.map((node, i) => {
              const actualIndex = Math.max(0, visibleStartIndex.value) + i
              if (isFixedMode.value) {
                // 固定模式：不包裹，保持原有行为
                return slots.default?.({ node })
              } else {
                // 动态模式：包裹 wrapper div，用于测量
                return (
                  <div key={actualIndex} data-virtual-index={actualIndex}>
                    {slots.default?.({ node })}
                  </div>
                )
              }
            })}
          </div>
        </div>
      )
    }
  },
})
