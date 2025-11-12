import { ExtractPropTypes, InjectionKey, PropType, SetupContext } from 'vue'

export type Key = string | number

export interface TreeOption {
  //TreeOption是用户传入的数据类型
  label?: Key
  key?: Key
  children?: TreeOption[]
  isLeaf?: boolean
  disabled?: boolean
  [key: string]: unknown //任意接口
}

export interface TreeNode extends Required<TreeOption> {
  //TreeNode是组件内部使用的数据类型
  level: number
  rawNode: TreeOption
  children: TreeNode[]
  isLeaf: boolean
}

export const treeProps = {
  //treeProps是树组件的props定义
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
  onLoad: Function as PropType<(node: TreeOption) => Promise<TreeOption[]>>,
  //选中逻辑：
  selectedKeys: {
    type: Array as PropType<Key[]>,
  },
  selectable: {
    type: Boolean,
    default: true,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
} as const //只读

export const treeNodeProps = {
  //treeNodeProps是树节点组件的props定义
  node: {
    type: Object as PropType<TreeNode>,
    required: true,
  },
  expanded: {
    type: Boolean,
    required: true,
  },
  loadingKeys: {
    type: Object as PropType<Set<Key>>,
  },
  selectedKeys: {
    type: Array as PropType<Key[]>,
    default: () => [],
  },
} as const

export type TreeProps = Partial<ExtractPropTypes<typeof treeProps>>
export type TreeNodeProps = Partial<ExtractPropTypes<typeof treeNodeProps>>

//TypeScript 读取对象键名和函数参数的类型

export const treeNodeEmits = {
  toggle: (node: TreeNode) => node,
  select: (node: TreeNode) => node,
}

export const treeEmits = {
  //内部发射的事件用来同步响应式数据
  'update:selectedKeys': (keys: Key[]) => keys,
}


export interface TreeContext {
  slots:SetupContext['slots'],
}
//此变量作为提供出去的属性
export const treeInjectKey: InjectionKey<TreeContext> = Symbol()

export const treeNodeContentProps = {
  node:{
    type: Object as PropType<TreeNode>,
    required:true,
  }
}