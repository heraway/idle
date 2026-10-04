import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
import MessagesScreen from "../screens/Chat/MessagesScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import SettingsScreen from "../screens/Profile/SettingsScreen";
import EditProfileScreen from "../screens/Profile/EditProfileScreen";
import UserProfileScreen from "../screens/Profile/UserProfileScreen";
import LeaveReviewScreen from "../screens/Profile/LeaveReviewScreen";
import ChangePasswordScreen from "../screens/Profile/ChangePasswordScreen";
import LegalDocScreen from "../screens/Profile/LegalDocScreen";
import VerificationScreen from "../screens/Verification/VerificationScreen";
import AdminDashboardScreen from "../screens/Admin/AdminDashboardScreen";
import { useLanguage } from "../context/LanguageContext";
import LanguageScreen from "../screens/Settings/LanguageScreen";
import NotificationSettingsScreen from "../screens/Settings/NotificationSettingsScreen";
import AccessibilityScreen from "../screens/Settings/AccessibilityScreen";
import DeleteAccountScreen from "../screens/Settings/DeleteAccountScreen";
import AboutScreen from "../screens/Settings/AboutScreen";
import AcknowledgementsScreen from "../screens/Settings/AcknowledgementsScreen";
import AppInfoScreen from "../screens/Settings/AppInfoScreen";
import HelpScreen from "../screens/Settings/HelpScreen";
import SupportFormScreen from "../screens/Settings/SupportFormScreen";
import ReportUserPickerScreen from "../screens/Settings/ReportUserPickerScreen";

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

// Placeholder for the centre "Post" tab — pressing it opens the PostJob screen
// instead of switching to a tab of its own.
function PostPlaceholder() {
  return null;
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="Jobs"
        component={JobFeedScreen}
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Post"
        component={PostPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("PostJob");
          },
        })}
        options={{
          tabBarLabel: "Post",
          tabBarActiveTintColor: theme.primary,
          tabBarIcon: () => (
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -16,
                borderWidth: 4,
                borderColor: theme.surface,
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <AppStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <AppStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job Details" }} />
      <AppStack.Screen name="PostJob" component={PostJobScreen} options={{ title: "Post a Job" }} />
      <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
      <AppStack.Screen name="ReportUser" component={ReportUserScreen} options={{ title: "Report" }} />
      <AppStack.Screen name="Verification" component={VerificationScreen} options={{ title: "Verification" }} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
      <AppStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
      <AppStack.Screen name="LeaveReview" component={LeaveReviewScreen} options={{ title: "Review" }} />
      <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
      <AppStack.Screen name="LegalDoc" component={LegalDocScreen} options={{ title: "" }} />
      <AppStack.Screen name="Language" component={LanguageScreen} options={{ title: t("settings.language") }} />
      <AppStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t("settings.notifications") }} />
      <AppStack.Screen name="Accessibility" component={AccessibilityScreen} options={{ title: t("settings.accessibility") }} />
      <AppStack.Screen name="Help" component={HelpScreen} options={{ title: t("settings.help") }} />
      <AppStack.Screen name="SupportForm" component={SupportFormScreen} options={{ title: "" }} />
      <AppStack.Screen name="ReportUserPicker" component={ReportUserPickerScreen} options={{ title: t("settings.reportUser") }} />
      <AppStack.Screen name="About" component={AboutScreen} options={{ title: t("settings.aboutIdle") }} />
      <AppStack.Screen name="Acknowledgements" component={AcknowledgementsScreen} options={{ title: t("settings.acknowledgements") }} />
      <AppStack.Screen name="AppInfo" component={AppInfoScreen} options={{ title: t("settings.appInfo") }} />
      <AppStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: t("settings.deleteAccount") }} />
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
