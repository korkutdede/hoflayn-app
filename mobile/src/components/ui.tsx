import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme';

export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  const body = <View style={styles.screenBody}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function AppTitle({
  eyebrow,
  children,
}: PropsWithChildren<{ eyebrow?: string }>) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function Field({
  label,
  suffix,
  ...props
}: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            styles.inputFlex,
            props.multiline && styles.multiline,
            suffix ? styles.inputWithSuffix : null,
          ]}
          {...props}
        />
        {suffix ? (
          <View style={styles.suffixBox} pointerEvents="none">
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  loading,
  disabled,
  ...props
}: PressableProps & {
  label: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.disabled,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  ...props
}: PressableProps & { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.secondaryPressed,
      ]}
      {...props}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.textButton}>{children}</Text>
    </Pressable>
  );
}

export function Message({
  children,
  tone = 'error',
}: PropsWithChildren<{ tone?: 'error' | 'success' }>) {
  return (
    <Text style={tone === 'error' ? styles.error : styles.success}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  screenBody: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flex: 1,
    padding: 20,
    gap: 18,
  },
  titleBlock: { gap: 4, marginTop: 8 },
  eyebrow: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800' },
  card: {
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'stretch' },
  inputFlex: { flex: 1 },
  inputWithSuffix: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  suffixBox: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.softBrand,
  },
  suffixText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    color: colors.ink,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  multiline: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingHorizontal: 18,
    backgroundColor: colors.brand,
  },
  buttonPressed: { backgroundColor: colors.brandPressed },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
  },
  secondaryPressed: { backgroundColor: colors.softBrand },
  secondaryButtonText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  textButton: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    padding: 8,
  },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
});
