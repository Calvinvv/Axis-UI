<template>
  <div class="demo-wrapper">
    <div class="demo-preview">
      <!-- 当传入 src 时，动态加载对应示例；否则回退渲染默认插槽 -->
      <component v-if="LoadedComponent" :is="LoadedComponent" />
      <slot v-else />
    </div>
  </div>

  <!-- 若加载失败，给出简易提示 -->
  <p v-if="errorMessage" class="demo-error">{{ errorMessage }}</p>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

// props: 可选的 src，相对 docs/src/components/ 的路径写法（如 ./demos/basic.vue）
const props = defineProps<{ src?: string }>()

// 使用 import.meta.glob 预索引 demos 目录下的所有示例
// 这里从当前文件相对路径出发：本文件位于 docs/.vitepress/theme/components/Demo.vue
// demos 实际在 docs/src/components/demos/*.vue，因此回退两级到 docs/.vitepress，再到 ../../src/components/demos
const demoModules = import.meta.glob('../../../src/components/demos/**/*.vue')

const LoadedComponent = ref<unknown | null>(null)
const errorMessage = ref('')

const normalizedKey = computed(() => {
  if (!props.src) return ''
  // 将 ./demos/basic.vue 转为实际的相对 key：../../../src/components/demos/basic.vue
  const cleaned = props.src.replace(/^\.\//, '')
  return `../../../src/components/${cleaned}`
})

async function loadDemo() {
  errorMessage.value = ''
  LoadedComponent.value = null

  if (!props.src) return
  const key = normalizedKey.value
  const loader = demoModules[key]

  if (!loader) {
    errorMessage.value = `未找到示例：${props.src}`
    return
  }

  try {
    const mod = (await loader()) as { default?: unknown } | unknown
    LoadedComponent.value =
      mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod
  } catch (err: unknown) {
    errorMessage.value = `示例加载失败：${err instanceof Error ? err.message : String(err)}`
  }
}

onMounted(loadDemo)
watch(() => props.src, loadDemo)
</script>

<style scoped>
.demo-wrapper {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.demo-preview {
  padding: 1.5rem;
  background: var(--vp-c-bg);
}

.demo-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0.5rem 0 0 0;
}
</style>
