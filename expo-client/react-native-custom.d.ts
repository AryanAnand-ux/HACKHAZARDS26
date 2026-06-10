import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
}
