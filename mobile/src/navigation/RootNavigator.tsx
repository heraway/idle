import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ConsentScreen from "../screens/Auth/ConsentScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";

import JobFeedScreen from "../screens/Jobs/JobFeedScreen";
import JobDetailScreen from "../screens/Jobs/JobDetailScreen";
import PostJobScreen from "../screens/Jobs/PostJobScreen";
import ReportUserScreen from "../screens/Jobs/ReportUserScreen";

import ChatScreen from "../screens/Chat/ChatScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import SettingsScreen from "../screens/Profile/SettingsScreen";
import ChangePasswordScreen from "../screens/Profile/ChangePasswordScreen";
import LegalDocScreen from "../screens/Profile/LegalDocScreen";
import VerificationScreen from "../screens/Verification/VerificationScreen";
import AdminDashboardScreen from "../screens/Admin/AdminDashboardScreen";

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Consent" component={ConsentScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: "" }} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: true, title: "" }} />
      <AuthStack.Screen name="LegalDoc" component={LegalDocScreen} options={{ headerShown: true, title: "" }} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="Jobs" component={JobFeedScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <AppStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <AppStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job Details" }} />
      <AppStack.Screen name="PostJob" component={PostJobScreen} options={{ title: "Post a Job" }} />
      <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
      <AppStack.Screen name="ReportUser" component={ReportUserScreen} options={{ title: "Report" }} />
      <AppStack.Screen name="Verification" component={VerificationScreen} options={{ title: "Verification" }} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
      <AppStack.Screen name="LegalDoc" component={LegalDocScreen} options={{ title: "" }} />
      <AppStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin" }} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      primary: theme.primary,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return <NavigationContainer theme={navTheme}>{user ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
