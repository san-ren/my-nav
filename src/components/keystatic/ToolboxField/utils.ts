// src/components/keystatic/utils.ts
import React from 'react';

// 定义一个常量，防止两个组件里的字符串拼写不一致
export const ICON_INPUT_DATA_ID = 'icon-input-field';

export const stopBubble = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

/**
 * React 16+ Hack: 强制触发原生 Input 的 onChange 事件
 * 用于让 Keystatic 感知到代码修改了 Input 的值
 */
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter?.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}