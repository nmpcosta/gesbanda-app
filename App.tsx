import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearStoredToken,
  getStoredToken,
  login,
  logout,
  me,
  register,
  setStoredToken,
} from './src/auth';
import { onSessionExpired, setApiLanguage } from './src/api';
import type { AuthResponse } from './src/types';
import {
  BrandMark,
  Button,
  Card,
  LanguageContext,
  ui,
  type Language,
} from './src/mobileUI';
import { MusicianHome } from './src/MusicianHome';
import ManagementApp from './ManagementApp';

export default function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [management, setManagement] = useState(false);
  const [language, setLanguage] = useState<Language>('pt');
  useEffect(() => setApiLanguage(language), [language]);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = (pt: string, en: string) => (language === 'en' ? en : pt);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const savedLanguage = await AsyncStorage.getItem('gesbanda.language');
        if (active && savedLanguage === 'en') setLanguage('en');
        const token = await getStoredToken();
        if (token) {
          const result = await me(token);
          if (active) setSession({ token, user: result.user });
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'GesBanda');
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(expired => {
        if (session?.token === expired) {
          setSession(null);
          setManagement(false);
          void clearStoredToken();
        }
      }),
    [session],
  );

  function switchLanguage() {
    const next = language === 'pt' ? 'en' : 'pt';
    setLanguage(next);
    void AsyncStorage.setItem('gesbanda.language', next);
  }

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = creating
        ? await register({
            first_name: first.trim(),
            last_name: last.trim(),
            email: email.trim(),
            password,
            password_confirmation: password,
          })
        : await login({ email: email.trim(), password });
      await setStoredToken(result.token);
      setPassword('');
      setSession(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('Não foi possível entrar.', 'Sign-in failed.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const token = session?.token;
    await clearStoredToken();
    setManagement(false);
    setSession(null);
    setError('');
    setPassword('');
    if (token) await logout(token).catch(() => undefined);
  }

  return (
    <SafeAreaProvider>
      <LanguageContext.Provider value={language}>
        <SafeAreaView style={ui.root}>
          <StatusBar barStyle="dark-content" />
          {loading ? (
            <ActivityIndicator
              accessibilityLabel={t('A validar sessão', 'Checking session')}
            />
          ) : session ? (
            management ? (
              <View style={ui.root}>
                <Button onPress={() => setManagement(false)}>
                  {t('Voltar à área do músico', 'Back to musician workspace')}
                </Button>
                <ManagementApp onSignOut={() => void signOut()} />
              </View>
            ) : (
              <MusicianHome
                key={session.user.id}
                session={session}
                onLogout={() => void signOut()}
                onLanguage={switchLanguage}
                onManage={() => setManagement(true)}
              />
            )
          ) : (
            <KeyboardAvoidingView
              style={ui.root}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={ui.body}
              >
                <View style={ui.opening}>
                  <View style={ui.identity}>
                    <BrandMark />
                    <Text style={ui.brand}>GesBanda</Text>
                  </View>
                  <Text style={ui.heroTitle}>
                    {t('Área do músico', 'Musician workspace')}
                  </Text>
                </View>
                <Card
                  title={
                    creating
                      ? t('Criar conta', 'Create account')
                      : t('Iniciar sessão', 'Sign in')
                  }
                >
                  {creating && (
                    <>
                      <TextInput
                        style={ui.input}
                        placeholder={t('Nome próprio', 'First name')}
                        value={first}
                        onChangeText={setFirst}
                      />
                      <TextInput
                        style={ui.input}
                        placeholder={t('Apelido', 'Last name')}
                        value={last}
                        onChangeText={setLast}
                      />
                    </>
                  )}
                  <TextInput
                    style={ui.input}
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={ui.input}
                    accessibilityLabel={t('Palavra-passe', 'Password')}
                    autoComplete={
                      creating ? 'new-password' : 'current-password'
                    }
                    secureTextEntry
                    placeholder={t('Palavra-passe', 'Password')}
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={() => void signIn()}
                  />
                  {error ? (
                    <Text accessibilityRole="alert" style={ui.error}>
                      {error}
                    </Text>
                  ) : null}
                  <Button
                    primary
                    disabled={
                      busy ||
                      !email.trim() ||
                      !password ||
                      (creating && (!first.trim() || !last.trim()))
                    }
                    onPress={() => void signIn()}
                  >
                    {creating
                      ? t('Criar conta', 'Create account')
                      : t('Entrar', 'Sign in')}
                  </Button>
                  <Button
                    disabled={busy}
                    onPress={() => {
                      setCreating(!creating);
                      setError('');
                    }}
                  >
                    {creating
                      ? t('Já tenho conta', 'I have an account')
                      : t('Registar-me', 'Register')}
                  </Button>
                </Card>
                <Button onPress={switchLanguage}>
                  {t('English', 'Português')}
                </Button>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </LanguageContext.Provider>
    </SafeAreaProvider>
  );
}
