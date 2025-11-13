import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Appearance } from 'react-native';

type GlobalErrorBoundaryProps = {
  children: ReactNode;
  theme?: 'light' | 'dark';
};

type GlobalErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const colorScheme = this.props.theme || Appearance.getColorScheme() || 'dark';
      const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
      const textColor = colorScheme === 'dark' ? '#fff' : '#111';
      const mutedColor = colorScheme === 'dark' ? '#666' : '#444';
      const buttonColor = colorScheme === 'dark' ? '#444' : '#ddd';
      const buttonTextColor = colorScheme === 'dark' ? '#fff' : '#111';

      return (
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor }]}>
            <Text style={[styles.title, { color: textColor }]}>Whoops! Something went wrong.</Text>
            <Text style={[styles.message, { color: mutedColor }]}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
            <TouchableOpacity
              onPress={this.handleReset}
              style={[styles.button, { backgroundColor: buttonColor }]}
            >
              <Text style={[styles.buttonText, { color: buttonTextColor }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});



