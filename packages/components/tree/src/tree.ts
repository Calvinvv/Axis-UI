import { ExtractPropTypes, PropType } from 'vue'

type Key = string | number

export interface TreeOption {
  label?: Key
  key?: Key
  children?: TreeOption[]
  isLeaf?: boolean
  [key: string]: unknown //任意接口
}

export interface TreeNode extends Required<TreeOption> {
  level: number
  rawNode: TreeOption
  children: TreeNode[]
  isLeaf: boolean
}

export const treeProps = {
  data: {
    type: Array as PropType<TreeOption[]>,
    default: () => [], //默认空数组
  },
  defaultExpandedKeys: {
    type: Array as PropType<Key[]>,
    default: () => [], //默认空数组
  },
  labelField: {
    type: String,
    default: 'label', //默认label
  },
  keyField: {
    type: String,
    default: 'key', //默认key
  },
  childrenField: {
    type: String,
    default: 'children', //默认children
  },
} as const //只读

export type TreeProps = Partial<ExtractPropTypes<typeof treeProps>>

export const treeNodeProps = {
  node: {
    type: Object as PropType<TreeNode>,
    required: true,
  },
  expanded: {
    type: Boolean,
    required: true,
  },
} as const
