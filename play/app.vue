<script setup lang="ts">
import { ref } from 'vue'
import { Key, TreeOption } from '../packages/components/tree'

function createData(level = 4, parentKey = '') {
  if (!level) return []
  const arr = new Array(20 - level).fill(0)
  return arr.map((_, idx: number) => {
    const key = parentKey + level + idx
    return {
      label: createLabel(level), // 显示的内容
      key, // 为了唯一性
      children: createData(level - 1, key), // 孩子
    }
  })
}

function createLabel(level: number): string {
  if (level === 4) return '道生一'
  if (level === 3) return '一生二'
  if (level === 2) return '二生三'
  if (level === 1) return '三生万物'
  return ''
}

// function createData() {
//   return [
//     {
//       label: nextLabel(),
//       key: 1,
//       isLeaf: false,
//     },
//     {
//       label: nextLabel(),
//       key: 2,
//       isLeaf: false,
//     },
//   ]
// }

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

// const data = ref<TreeOption[]>([
//   {
//     key: '0',
//     label: '0',
//     children: [
//       {
//         key: '0-0',
//         label: '0-0',
//       },
//       {
//         disabled: true, // 这个节点被禁用了
//         key: '0-1',
//         label: '0-1',
//         children: [
//           {
//             label: '0-1-0',
//             key: '0-1-0',
//           },
//           {
//             label: '0-1-1',
//             key: '0-1-1',
//           },
//         ],
//       },
//     ],
//   },
// ])

const handleLoad = (node: TreeOption) => {
  //当用户需要异步获取时，会传入孩子树不为零也不是，:on-load属性,并配套函数
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

const value = ref<Key[]>([])
const check = ref(true)

const handleChange = (val: boolean) => {
  console.log('checkbox changed:', val)
}
</script>
<template>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-tree
    :data="data"
    :on-load="handleLoad"
    v-model:selected-keys="value"
    selectabal
    multiple
  >
    <template #default="{ node }">{{ node.key }} - {{ node.label }}</template>
  </ax-tree>
  <!--selectabal:可以选择节点     multiple：可以多选节点
     selected-keys：选中后的节点-->

  {{ check }}
  <ax-checkbox
    v-model="check"
    :disabled="false"
    :indeterminate="true"
    label="属性方式传入节点"
    @change="handleChange"
    >插槽方式传入节点</ax-checkbox
  >
</template>
