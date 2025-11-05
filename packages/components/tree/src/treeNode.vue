<template>
  <div :class="bem.b()">
    <div
      :class="bem.e('content')"
      :style="{ paddingLeft: `${node.level * 16}px` }"
    >
      <span
        :class="[bem.e('expand-icon'), { expanded: expanded && !node?.isLeaf }]"
      >
        <ax-icon :size="20" :color="'green'">
          <i-codex:direction-down-right></i-codex:direction-down-right>
        </ax-icon>
      </span>
      <span>{{ node?.label }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { createNamespace } from '@axis-ui/utils/create'
import { treeNodeProps } from './tree'
const bem = createNamespace('tree-node')
defineProps(treeNodeProps)
</script>
