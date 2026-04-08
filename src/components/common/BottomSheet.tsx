import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, title, children }: Props) {
  const { theme } = useTheme();
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
          maxHeight: '80%',
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: c.onBackground,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {children}
      </View>
    </Modal>
  );
}
