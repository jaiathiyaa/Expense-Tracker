import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  GetStarted: undefined;
  Login: { registeredEmail?: string; registrationSuccess?: boolean } | undefined;
  Register: undefined;
  MainTabs: { screen?: string } | undefined;
  AddTransaction: { initialType?: 'EXPENSE' | 'INCOME' } | undefined;
  Settings: undefined;
  SmartFeatures: undefined;
  SmsImport: undefined;
  VoiceEntry: undefined;
};

export type GetStartedNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GetStarted'
>;

export type LoginNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

export type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;

export type RegisterNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Register'
>;

export type MainTabsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

export type AddTransactionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddTransaction'
>;

export type AddTransactionRouteProp = RouteProp<
  RootStackParamList,
  'AddTransaction'
>;

export type SettingsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;


