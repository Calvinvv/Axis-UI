<template>
  <div :class="bem.b()">
    <!-- 模版有自带的优化，如果自定义比较强的我们采用tsx来编写 -->

    <AxTreeNode
      v-for="node in flattenTree"
      :key="node.key"
      :node="node"
      :expanded="isExpanded(node)"
      @toggle="toggleExpand"
    >
    </AxTreeNode>
  </div>
</template>

<script setup lang="ts">
import { Key, TreeNode, TreeOption, treeProps } from './tree'
import { computed, ref, watch } from 'vue'
import AxTreeNode from './treeNode.vue'
import { createNamespace } from '@axis-ui/utils/create'
const bem = createNamespace('tree')
defineOptions({
  name: 'AxTree',
})

//后续使用watch监听props.data变化，更新tree
const props = defineProps(treeProps)

/**
data:
[
  { id: '1', name: 'Node 1', children: [ ... ] },
  { id: '2', name: 'Node 2', children: [] }
]

key-field="id"
label-field="name"
children-field="children"
 */

// 我们将props.data 格式化后放到tree中
const tree = ref<TreeNode[]>([])

//1.用来绑定data中被当做key、label、children的字段
function createOptions(key: string, label: string, children: string) {
  return {
    getKey(node: TreeOption) {
      return node[key] as string // 用户传递的key
    },
    getLabel(node: TreeOption) {
      return node[label] as string // 用户传递label
    },
    getChildren(node: TreeOption) {
      return node[children] as TreeOption[] // 用户传递的children获取孩子
    },
  }
}
const treeOptions = createOptions(
  props.keyField,
  props.labelField,
  props.childrenField
)

//2.将用户传递的数据格式化成TreeNode类型
function createTree(data: TreeOption[], parent: TreeNode | null = null) {
  function traversal(data: TreeOption[], parent: TreeNode | null = null) {
    return data.map(node => {
      const children = treeOptions.getChildren(node) || []
      const treeNode: TreeNode = {
        key: treeOptions.getKey(node),
        label: treeOptions.getLabel(node),
        children: [], // 默认为空
        rawNode: node,
        level: parent ? parent.level + 1 : 0,
        isLeaf: node.isLeaf ?? children.length === 0, //如果没有传入isLeaf，则根据children数判断，增强代码健壮性
      }
      if (children.length > 0) {
        // 有孩子再去递归孩子，将其格式化成treeNode类型
        treeNode.children = traversal(children, treeNode)
      }
      return treeNode
    })
  }

  const result: TreeNode[] = traversal(data, parent)
  return result
}

watch(
  () => props.data,
  (data: TreeOption[]) => {
    tree.value = createTree(data)
    console.log('tree.value', tree.value)
  },
  { immediate: true }
)

//需要展开的key有哪些
const expandedKeysSet = ref(new Set(props.defaultExpandedKeys))
//3.拍平树结构，为了后续渲染节点。这里需要依赖当前展开的节点
const flattenTree = computed(() => {
  const expandedKeys = expandedKeysSet.value //要展开的key集合

  const flattenNodes: TreeNode[] = [] //拍平后的节点数组,即结果

  const nodes = tree.value || [] //被格式化后的节点

  const stack: TreeNode[] = [] //辅助栈，用于遍历树

  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push(nodes[i])
  }

  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    flattenNodes.push(node)
    if (expandedKeys.has(node.key)) {
      const children = node.children
      if (children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
    }
  }
  return flattenNodes
})

function isExpanded(node: TreeNode): boolean {
  return expandedKeysSet.value.has(node.key)
}

//折叠
function collpase(node: TreeNode) {
  expandedKeysSet.value.delete(node.key)
}

const loadingKeysRef = ref(new Set<Key>())

function triggerLoading(node: TreeNode) {
  //通过节点状态，判断该节点是否需要进行异步加载
  if (!node.children.length && !node.isLeaf) {
    //如果没有孩子且不是叶子节点，说明需要异步加载
    //防止重复加载
    const loadingKeys = loadingKeysRef.value //loadingKeys为正在加载的key集合
    if (!loadingKeys.has(node.key)) {
      loadingKeys.add(node.key)

      //调用用户传递的onLoad函数
      if (props.onLoad) {
        props.onLoad(node.rawNode).then(children => {
          //调用onLoad函数，传递当前节点的原始数据,children来自于onLoad的返回值
          //1. 将异步加载的子节点数据保存到原始节点
          node.rawNode.children = children
          // 2. 将子节点数据转换为树形结构
          node.children = createTree(children, node)
          loadingKeys.delete(node.key)
        })
      }
    }
  }
}

//展开
function expand(node: TreeNode) {
  expandedKeysSet.value.add(node.key)

  //调用或判断是否进行加载逻辑
  triggerLoading(node)
}

//4.让用户点击展开
function toggleExpand(node: TreeNode) {
  const expandKeys = expandedKeysSet.value
  if (expandKeys.has(node.key)) {
    collpase(node)
  } else {
    expand(node)
  }
}
</script>
