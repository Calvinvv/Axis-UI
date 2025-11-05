<template>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-icon :size="160" :color="'red'">
    <i-codex:checklist></i-codex:checklist>
  </ax-icon>
  <ax-tree
    :data="treeData"
    key-field="id"
    label-field="name"
    children-field="children"
    :default-expanded-keys="['1', '1-1']"
  />
</template>
<script setup lang="ts">
const treeData = [
  {
    id: '1',
    name: '电子产品',
    children: [
      {
        id: '1-1',
        name: '手机',
        children: [
          {
            id: '1-1-1',
            name: 'iPhone 15',
            children: [],
          },
          {
            id: '1-1-2',
            name: 'Samsung Galaxy S24',
            children: [],
          },
        ],
      },
      {
        id: '1-2',
        name: '笔记本电脑',
        children: [
          {
            id: '1-2-1',
            name: 'MacBook Pro',
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: '图书',
    children: [
      {
        id: '2-1',
        name: '技术书籍',
        children: [],
      },
      {
        id: '2-2',
        name: '小说',
        children: [
          {
            id: '2-2-1',
            name: '三体',
            children: [],
          },
          {
            id: '2-2-2',
            name: '活着',
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: '3',
    name: '孤品（无子节点）',
    children: [],
  },
]
</script>
