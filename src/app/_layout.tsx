/**
 * Stack racine (design §1.1). Tant que le store n'est pas réhydraté, un écran neutre
 * recouvre la navigation : aucun chiffre faux n'est affiché (design §4, conventions).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { LoadingScreen } from '@/components/Screen';
import { useLearnerStore } from '@/store/useLearnerStore';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const hasHydrated = useLearnerStore((s) => s.hasHydrated);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Accueil' }} />
        <Stack.Screen name="session" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="session-result" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="test-run" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="test-result" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages', headerBackTitle: 'Retour' }} />
      </Stack>
      {hasHydrated ? null : (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
