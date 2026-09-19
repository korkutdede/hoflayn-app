// `@expo/metro-runtime` MUST be first so Fast Refresh works correctly.
import '@expo/metro-runtime';
import 'react-native-reanimated';

import { ExpoRoot } from 'expo-router';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Must be exported or Fast Refresh won't update the context.
// Bypasses EXPO_ROUTER_APP_ROOT when expo-router is hoisted in the monorepo.
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

renderRootComponent(App);
