import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'HowToUse'>;

export default function HowToUseScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const steps = [
    { title: 'Create a Preset', body: 'Tap "+ Create Preset" to build your custom meditation with warm-up phases, timed sessions, and sounds.' },
    { title: 'Start Meditating', body: 'Tap any preset from the home screen to begin. The timer guides you through each phase.' },
    { title: 'Track Your Progress', body: 'After each session, save it to build your streak and see your journey over time.' },
    { title: 'Customize Sounds', body: 'Add interval sounds (bells, chimes) that play during meditation to help maintain focus.' },
    { title: 'Backup Your Data', body: 'Sign in with Google to keep your presets and session history safe in the cloud.' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.onBackground }}>
          How to Use
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {steps.map((step, i) => (
          <View key={i} style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: c.onPrimary, fontWeight: '700', fontSize: 14 }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: c.onBackground }}>{step.title}</Text>
            </View>
            <Text style={{ color: c.onSurface, lineHeight: 20, paddingLeft: 40 }}>{step.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
