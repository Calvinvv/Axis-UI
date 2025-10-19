import type { App, Plugin, Component } from 'vue'

//以下类型必须导出，否则生成不了.d.ts文件
export type SFCWithInstall<T> = T & Plugin

export const withInstall = <T extends Component & { name: string }>(comp: T) => {
  ;(comp as SFCWithInstall<T>).install = function (app: App) {
    app.component(comp.name, comp)
  }
  return comp as SFCWithInstall<T>
}

