<template>
  <label :class="bem.b()">
    <span :class="bem.e('input')">
      <input
        type="checkbox"
        v-model="model"
        ref="inputRef"
        :disabled="disabled"
        :value="label"
        @change="handleChange"
      />
    </span>

    <span v-if="$slots.default || label" :class="bem.e('label')">
      <slot></slot>
      <template v-if="!$slots.default">{{ label }}</template>
    </span>
  </label>
</template>

<script lang="ts" setup>
import { createNamespace } from '@axis-ui/utils/create'
import { checkboxEmits, checkboxProps } from './checkbox'
import { computed, onMounted, ref, watch } from 'vue'

const bem = createNamespace('checkbox')
const props = defineProps(checkboxProps)
const emit = defineEmits(checkboxEmits)

defineOptions({
  name: 'AxCheckbox',
})

const model = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  },
})

const inputRef = ref<HTMLInputElement>()

function indeterminate(val: boolean) {
  if (inputRef.value) {
    inputRef.value.indeterminate = val
  }
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  const value = target.checked
  emit('change', value)
}

watch(() => props.indeterminate, indeterminate)

onMounted(() => {
  indeterminate(props.indeterminate)
})
</script>
