declare module '@react-native-picker/picker' {
  import * as React from 'react';
import { ColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

  export interface PickerProps<T> extends React.PropsWithChildren<Record<string, unknown>> {
    selectedValue?: T;
    onValueChange?: (itemValue: T, itemIndex: number) => void;
    enabled?: boolean;
    mode?: 'dialog' | 'dropdown';
    prompt?: string;
    style?: StyleProp<ViewStyle>;
    itemStyle?: StyleProp<TextStyle>;
    dropdownIconColor?: ColorValue;
    dropdownIconRippleColor?: ColorValue;
    testID?: string;
  }

  export interface PickerItemProps<T> {
    label: string;
    value: T;
    color?: ColorValue;
    testID?: string;
  }

  export class Picker<T = any> extends React.Component<PickerProps<T>> {
    static Item: React.ComponentType<PickerItemProps<T>>;
  }

  export { Picker };
  export default Picker;
}


