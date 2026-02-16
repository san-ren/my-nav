// src/components/keystatic/ToolboxField.tsx
import { fields } from '@keystatic/core'; 
import { AutoFillerComponent } from './AutoFiller';
import { IconPickerInput } from './IconPicker';

// 1. Toolbox Field (工具箱：其实就是个自定义的 AutoFiller)
const _dummyText = fields.text({ label: 'dummy' });
type TextFieldType = typeof _dummyText;

export const toolboxField = {
  kind: 'form' as const,
  Input: AutoFillerComponent,
  defaultValue: () => null,
  parse: () => null,
  serialize: () => ({ value: null }),
  validate: (value: any) => true, 
  reader: { parse: () => null },
} as any; 

// 2. Icon Picker Field (图标选择器)
export const iconPickerField = {
    kind: 'form' as const,
    Input: IconPickerInput,
    defaultValue: () => '',
    validate: (value: unknown) => typeof value === 'string',
    parse: (value: unknown) => (value === undefined || value === null) ? '' : String(value),
    serialize: (value: unknown) => ({ value: value }), 
    reader: {
        parse: (value: unknown) => (value === undefined || value === null) ? '' : String(value),
    }
} as unknown as TextFieldType;