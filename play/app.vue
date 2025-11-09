<script setup lang="ts">
import { ref } from 'vue'
import { TreeOption } from '../packages/components/tree'
function createData() {
  return [
    {
      label: nextLabel(),
      key: 1,
      isLeaf: false,
    },
    {
      label: nextLabel(),
      key: 2,
      isLeaf: false,
    },
  ]
}

function nextLabel(currentLabel?: string | number): string {
  if (!currentLabel) return 'Out of Tao, One is born'
  if (currentLabel === 'Out of Tao, One is born') return 'Out of One, Two'
  if (currentLabel === 'Out of One, Two') return 'Out of Two, Three'
  if (currentLabel === 'Out of Two, Three') {
    return 'Out of Three, the created universe'
  }
  if (currentLabel === 'Out of Three, the created universe') {
    return 'Out of Tao, One is born'
  }
  return ''
}

const data = ref(createData())

const handleLoad = (node: TreeOption) => {//当用户需要异步获取时，会传入孩子树不为零也不是，:on-load属性,并配套函数
  return new Promise<TreeOption[]>(resolve => {
    setTimeout(() => {
      resolve([
        //这里面的数据会作为当前正在展开的node的children属性，现在是用promise模拟数据
        {
          label: nextLabel(node.label),
          key: node.key + nextLabel(node.label),
          isLeaf: false,
        },
      ])
    }, 500)
  })
}
</script>
<template>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-tree :data="data" :on-load="handleLoad"></ax-tree>
</template>
