import { ExtractPropTypes, PropType } from 'vue'

export const checkboxProps = {
  modelValue: {
    type: [Boolean, String, Number] as PropType<boolean | string | number>,
  },
  indeterminate: Boolean,
  disabled: Boolean,
  label: {
    type: String as PropType<string>,
  },
} as const

export type checkboxProps = Partial<ExtractPropTypes<typeof checkboxProps>>

export const checkboxEmits = ['update:modelValue', 'change']

export type checkboxEmits = typeof checkboxEmits
