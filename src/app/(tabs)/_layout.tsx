/**
 * Barre d'onglets : Accueil | Apprendre | Progrès | Test (design §4.0).
 * Une pastille signale le test de la semaine disponible.
 */
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { useNow } from '@/hooks/useNow';
import { useTestStatus } from '@/hooks/useLearnerSelectors';
import { colors } from '@/theme/tokens';

function TabIcon({ emoji, focused, dot = false }: { emoji: string; focused: boolean; dot?: boolean }) {
  return (
    <View accessible={false}>
      <Text style={[styles.emoji, !focused && styles.inactive]}>{emoji}</Text>
      {dot ? <View style={styles.dot} testID="test-available-dot" /> : null}
    </View>
  );
}

export default function TabsLayout() {
  const now = useNow();
  const testStatus = useTestStatus(now);
  const testAvailable = testStatus.kind === 'available';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarAccessibilityLabel: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Apprendre',
          tabBarAccessibilityLabel: 'Apprendre',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progrès',
          tabBarAccessibilityLabel: 'Progrès',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarAccessibilityLabel: testAvailable ? 'Test, test de la semaine disponible' : 'Test',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} dot={testAvailable} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 22, lineHeight: 26 },
  inactive: { opacity: 0.6 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
