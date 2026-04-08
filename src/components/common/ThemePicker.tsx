import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { allThemes } from '../../theme/themes';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ThemePicker({ visible, onClose }: Props) {
  const { theme, setThemeId } = useTheme();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          paddingBottom: 40,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground, marginBottom: 20, textAlign: 'center' }}>
          Choose Theme
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {allThemes.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setThemeId(t.id);
                onClose();
              }}
              style={{ alignItems: 'center' }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.colors.background,
                  borderWidth: 3,
                  borderColor: t.id === theme.id ? t.colors.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: t.colors.primary,
                  }}
                />
              </View>
              <Text style={{ fontSize: 11, color: c.onSurface }}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
