<template>
  <div :class="bem.b()">
    <div
      :class="bem.e('content')"
      :style="{ paddingLeft: `${node.level * 16}px` }"
    >
      <span
        :class="[bem.e('expand-icon'), { expanded: expanded && !node?.isLeaf },bem.is('leaf',node.isLeaf)]"
        @click="handleExpand"
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
import { treeNodeEmits, treeNodeProps } from './tree'
const bem = createNamespace('tree-node')
const props = defineProps(treeNodeProps)

const emit = defineEmits(treeNodeEmits)
function handleExpand() {
  emit('toggle', props.node)
}
</script>
