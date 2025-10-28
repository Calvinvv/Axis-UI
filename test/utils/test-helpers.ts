import { mount } from '@vue/test-utils'
import type { ComponentMountingOptions } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 通用的组件测试配置
export const defaultMountOptions: ComponentMountingOptions<any> = {}

/**
 * 创建一个通用的组件测试挂载函数
 * @param component 要测试的组件
 * @param options 挂载选项
 */
export function createWrapper<T extends Record<string, any>>(
  component: any,
  options: ComponentMountingOptions<T> = {}
) {
  return mount(component, {
    ...defaultMountOptions,
    ...options,
  })
}

/**
 * 测试组件属性的工具函数
 * @param wrapper 组件实例
 * @param prop 属性名
 * @param expectedValue 期望值
 */
export function expectProp<T>(wrapper: any, prop: string, expectedValue: T) {
  expect(wrapper.props(prop)).toBe(expectedValue)
}

/**
 * 测试样式是否正确应用
 * @param wrapper 组件实例
 * @param selector CSS选择器
 * @param styles 期望的样式对象
 */
export function expectStyles(
  wrapper: any,
  selector: string,
  styles: Record<string, string>
) {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)

  const elementStyles = element.attributes('style') || ''

  Object.entries(styles).forEach(([property, value]) => {
    expect(elementStyles).toContain(`${property}: ${value}`)
  })
}

/**
 * 测试事件是否正确触发
 * @param wrapper 组件实例
 * @param eventName 事件名
 * @param eventData 事件数据
 */
export function expectEventEmitted(
  wrapper: any,
  eventName: string,
  eventData?: any
) {
  expect(wrapper.emitted()[eventName]).toBeDefined()
  if (eventData !== undefined) {
    expect(wrapper.emitted()[eventName][0]).toEqual(eventData)
  }
}

/**
 * 测试插件内容的工具函数
 * @param wrapper 组件实例
 * @param expectedContent 期望的 Slot 内容
 */
export function expectSlotContent(wrapper: any, expectedContent: string) {
  expect(wrapper.text()).toContain(expectedContent)
}

/**
 * 测试是否包含正确的类名
 * @param wrapper 组件实例
 * @param selector CSS选择器
 * @param className 期望的类名
 */
export function expectClassName(
  wrapper: any,
  selector: string,
  className: string
) {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.classes()).toContain(className)
}
