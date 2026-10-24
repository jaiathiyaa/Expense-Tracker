import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { GetStartedScreen } from '../screens/GetStartedScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SmartFeaturesScreen } from '../screens/SmartFeaturesScreen';
import { SmsImportScreen } from '../screens/SmsImportScreen';
import { VoiceEntryScreen } from '../screens/VoiceEntryScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.splashBrand}>
          <View style={styles.logoCircle}>
            <Ionicons name="wallet" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.splashTitle}>Expense Tracker</Text>
          <Text style={styles.splashSubtitle}>Financial clarity made simple</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen
            name="AddTransaction"
            component={AddTransactionScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="SmartFeatures"
            component={SmartFeaturesScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="SmsImport"
            component={SmsImportScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="VoiceEntry"
            component={VoiceEntryScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : (

        <>
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  splashBrand: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  splashTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  splashSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  spinner: {
    marginTop: theme.spacing.md,
  },
});
