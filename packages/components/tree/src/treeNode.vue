<template>
  <div :class="[bem.b(), bem.is('selected', isSelected)]">
    <div
      :class="[bem.e('content')]"
      :style="{ paddingLeft: `${node.level * 16}px` }"
    >
      <span
        :class="[
          bem.e('expand-icon'),
          { expanded: expanded && !node?.isLeaf },
          bem.is('leaf', node.isLeaf),
        ]"
        @click="handleExpand"
      >
        <ax-icon :size="20" :color="'green'">
          <i-codex:direction-down-right
            v-if="!isLoading"
          ></i-codex:direction-down-right>
          <i-codex:loader v-else></i-codex:loader>
        </ax-icon>
      </span>
      <span @click="handleSeleted" :class="bem.e('label')">{{
        node?.label
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { createNamespace } from '@axis-ui/utils/create'
import { treeNodeEmits, treeNodeProps } from './tree'
import { computed } from 'vue'
const bem = createNamespace('tree-node')
const props = defineProps(treeNodeProps)

const emit = defineEmits(treeNodeEmits)
function handleExpand() {
  emit('toggle', props.node)
}

const isLoading = computed(() => {
  return props.loadingKeys?.has(props.node.key)
})

const isSelected = computed(() => {
  return props.selectedKeys.includes(props.node.key)
})

function handleSeleted() {
  emit('select', props.node)
}
</script>
