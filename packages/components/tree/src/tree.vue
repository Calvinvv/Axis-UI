<template>
  <div :class="bem.b()">
    <!-- 模版有自带的优化，如果自定义比较强的我们采用tsx来编写 -->

    <AxTreeNode v-for="node in flattenTree" :key="node.key" :node="node" :expanded="isExpanded(node)">
    </AxTreeNode>
  </div>
</template>

<script setup lang="ts">
import { TreeNode, TreeOption, treeProps } from './tree'
import { computed, ref, watch } from 'vue'
import AxTreeNode from './treeNode.vue'
import { createNamespace } from '@axis-ui/utils/create'
const bem = createNamespace('tree')
defineOptions({
  name: 'AxTree',
})

//后续使用watch监听props.data变化，更新tree
const props = defineProps(treeProps)

// 我们将props.data 格式化后放到tree中
const tree = ref<TreeNode[]>([])

//用来绑定data中被当做key、label、children的字段
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

//负责构建树结构，通过map遍历所有
function createTree(data: TreeOption[]) {
  function traversal(data: TreeOption[], parent: TreeNode | null = null) {
    return data.map(node => {
      const children = treeOptions.getChildren(node) || []
      const treeNode: TreeNode = {
        key: treeOptions.getKey(node),
        label: treeOptions.getLabel(node),
        children: [], // 默认为空
        rawNode: node,
        level: parent ? parent.level + 1 : 0,
        isLeaf: node.isLeaf ?? children.length === 0,//如果没有传入isLeaf，则根据children数判断，增强代码健壮性
      }
      if (children.length > 0) {
        // 有孩子再去递归孩子，将其格式化成treeNode类型
        treeNode.children = traversal(children, treeNode)
      }
      return treeNode
    })
  }

  const result: TreeNode[] = traversal(data)
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

//处理拍平

//需要展开的key有哪些
const expandedKeysSet = ref(new Set(props.defaultExpandedKeys))

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


</script>
