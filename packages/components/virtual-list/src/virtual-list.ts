import { ExtractPropTypes, PropType } from 'vue'

export const virtualListProps = {
  /** 每项的固定高度（px）— 固定高度模式。传 > 0 启用固定模式 */
  size: {
    type: Number,
    default: 0,
  },
  /** 预估高度（px）— 动态高度模式。传 > 0 且 size 为 0 时启用动态模式 */
  estimatedSize: {
    type: Number,
    default: 0,
  },
  /** 可视区域内保留的条目数 */
  remain: {
    type: Number,
    default: 8,
  },
  /** 数据列表 */
  items: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
} as const

export type VirtualListProps = ExtractPropTypes<typeof virtualListProps>

export type VirtualListAlignment = 'auto' | 'start' | 'center' | 'end'

export interface VirtualListExpose {
  scrollToIndex: (index: number, alignment?: VirtualListAlignment) => void
}
