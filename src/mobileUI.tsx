import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type Language = 'pt' | 'en';
export const LanguageContext = createContext<Language>('pt');
export function useWords() {
  const language = useContext(LanguageContext);
  return (pt: string, en: string) => (language === 'en' ? en : pt);
}
export function Button({
  children,
  onPress,
  primary,
  disabled,
  selected,
}: {
  children: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        primary && ui.primary,
        selected && !primary && ui.selectedButton,
        pressed && !disabled && ui.pressedButton,
        disabled && ui.dim,
      ]}
    >
      <Text style={[ui.buttonText, primary && ui.inverse]}>
        {selected && <Text accessible={false}>✓ </Text>}
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={ui.card}>
      {title ? (
        <Text accessibilityRole="header" style={ui.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
export function BrandMark() {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={ui.mark}
    >
      {[12, 24, 18, 9].map((height, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height,
            borderRadius: 2,
            backgroundColor: '#e6cbed',
          }}
        />
      ))}
    </View>
  );
}
export const ui = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f5fa' },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#30213f',
    gap: 4,
  },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#51395e',
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  identityText: { flex: 1, gap: 2 },
  hero: { padding: 20, borderRadius: 19, backgroundColor: '#4a325d', gap: 12 },
  heroTag: { fontSize: 13, fontWeight: '700', color: '#e4cdec' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 25 },
  heroDetail: { color: '#f2eaf5', fontSize: 16 },
  opening: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#30213f',
    minHeight: 150,
    justifyContent: 'space-between',
    gap: 20,
  },
  brand: {
    color: '#ddc9ea',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  band: { color: 'white', fontSize: 22, fontWeight: '700' },
  heading: { color: '#30213f', fontSize: 28, fontWeight: '800' },
  title: { color: '#332843', fontSize: 19, fontWeight: '700' },
  text: { color: '#392d43', fontSize: 16 },
  muted: { color: '#665871', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  card: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2dbe8',
    backgroundColor: 'white',
    gap: 10,
  },
  button: {
    borderColor: '#c9bbd5',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 48,
    maxWidth: '100%',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  primary: { backgroundColor: '#624278', borderColor: '#624278' },
  selectedButton: { backgroundColor: '#eee6f5', borderColor: '#76568c' },
  pressedButton: { opacity: 0.8 },
  buttonText: {
    color: '#50365e',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  inverse: { color: '#fff' },
  dim: { opacity: 0.55 },
  input: {
    borderColor: '#b8aabf',
    borderWidth: 1,
    backgroundColor: 'white',
    color: '#30213f',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  notice: {
    backgroundColor: '#eee7f4',
    color: '#422750',
    padding: 12,
    borderRadius: 10,
  },
  error: { color: '#922c40' },
  nav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#e0d6e8',
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabActive: {
    backgroundColor: '#eee6f5',
    borderTopWidth: 3,
    borderColor: '#624278',
  },
  tabText: {
    fontWeight: '700',
    color: '#523e61',
    textAlign: 'center',
    fontSize: 13,
  },
});
