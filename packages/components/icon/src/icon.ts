//放置属性声明，即定义组件所包含的属性
//这里主要放置的是组件的props和一些公共方法
import type { ExtractPropTypes, PropType } from 'vue' //引入ExtractPropTypes类型，用于提取props的类型

export const iconProps = {
  color:String,
  size:[Number, String] as PropType<number | string>,
} as const //使用as const断言，确保属性对象的类型是只读的

export type IconProps = ExtractPropTypes<typeof iconProps> //提取iconProps的类型，并导出为IconProps
