import { Stack } from 'expo-router';

export default function AssessmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    />
  );
}

