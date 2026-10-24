import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddTransactionModal } from '../components/dashboard/AddTransactionModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

const Tab = createBottomTabNavigator();

// Empty dummy component for the center Add tab button trigger
const EmptyComponent = () => null;

export const MainTabNavigator: React.FC = () => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        >
          {({ navigation }) => (
            <HomeScreen
              onNavigateToTransactions={() => navigation.navigate('Transactions')}
              onNavigateToInsights={() => navigation.navigate('Insights')}
              onNavigateToProfile={() => navigation.navigate('Profile')}
              onNavigateToAddExpense={() =>
                rootNavigation.navigate('AddTransaction', { initialType: 'EXPENSE' })
              }
              onNavigateToAddIncome={() =>
                rootNavigation.navigate('AddTransaction', { initialType: 'INCOME' })
              }
              onNavigateToSmsImport={() => rootNavigation.navigate('SmsImport')}
              onNavigateToVoiceEntry={() => rootNavigation.navigate('VoiceEntry')}
              onNavigateToSmartFeatures={() => rootNavigation.navigate('SmartFeatures')}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Transactions"
          options={{
            tabBarLabel: 'Transactions',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'receipt' : 'receipt-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        >
          {() => (
            <TransactionsScreen
              onNavigateToAdd={() =>
                rootNavigation.navigate('AddTransaction', { initialType: 'EXPENSE' })
              }
            />
          )}
        </Tab.Screen>

        {/* Center Add Button */}
        <Tab.Screen
          name="Add"
          component={EmptyComponent}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.centerAddButton}
                activeOpacity={0.85}
                onPress={() =>
                  rootNavigation.navigate('AddTransaction', { initialType: 'EXPENSE' })
                }
                accessibilityRole="button"
                accessibilityLabel="Add new transaction"
              >
                <View style={[styles.centerAddCircle, theme.shadows.button]}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />


        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarLabel: 'Insights',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'pie-chart' : 'pie-chart-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
};


const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...theme.shadows.soft,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  centerAddButton: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  centerAddCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
});
