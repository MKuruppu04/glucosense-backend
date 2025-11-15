# GlucoSense Mobile App - React Native

## 📱 Overview

Complete iOS and Android mobile application for GlucoSense glucose monitoring.

---

## ✨ Features

### Planned Features:
- ✅ User registration and authentication
- ✅ Real-time glucose monitoring
- ✅ Push notifications for critical alerts
- ✅ Offline mode with data sync
- ✅ Biometric authentication (Face ID / Touch ID / Fingerprint)
- ✅ Manual glucose entry
- ✅ Medication tracking
- ✅ Food logging
- ✅ Charts and trends
- ✅ Guardian management
- ✅ Export data to PDF/CSV
- ✅ Dark mode support
- ✅ Multi-language support

---

## 🚀 Setup Instructions

### **Prerequisites:**

```bash
# Install Node.js 18+
node --version

# Install React Native CLI
npm install -g react-native-cli

# For iOS development (Mac only):
# Install Xcode from App Store
# Install CocoaPods
sudo gem install cocoapods

# For Android development:
# Install Android Studio
# Install Android SDK
# Set up Android emulator
```

### **Create React Native App:**

```bash
# Navigate to project directory
cd c:\Users\User\CascadeProjects\personal-website\mobile-app

# Create new React Native app
npx react-native init GlucoSenseApp

# Navigate to app folder
cd GlucoSenseApp

# Install dependencies
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install axios react-native-async-storage/async-storage
npm install react-native-push-notification
npm install react-native-biometrics
npm install react-native-chart-kit react-native-svg
npm install @react-native-firebase/app @react-native-firebase/messaging
npm install react-native-vector-icons
```

### **For iOS (Mac only):**

```bash
cd ios
pod install
cd ..
```

### **Run the App:**

```bash
# iOS (Mac only)
npx react-native run-ios

# Android
npx react-native run-android
```

---

## 📁 App Structure

```
GlucoSenseApp/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── Home/
│   │   │   ├── DashboardScreen.js
│   │   │   └── MonitorScreen.js
│   │   ├── Profile/
│   │   │   ├── ProfileScreen.js
│   │   │   └── SettingsScreen.js
│   │   └── Guardians/
│   │       └── GuardiansScreen.js
│   ├── components/
│   │   ├── GlucoseChart.js
│   │   ├── AlertCard.js
│   │   └── StatsCard.js
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── notifications.js
│   ├── utils/
│   │   ├── storage.js
│   │   └── helpers.js
│   └── theme/
│       ├── colors.js
│       └── typography.js
├── android/
├── ios/
└── package.json
```

---

## 🔧 Configuration

### **1. API Configuration** (`src/services/api.js`):

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api/v1';
// For real device, use your computer's IP:
// const API_BASE_URL = 'http://192.168.1.100:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### **2. Push Notifications** (`src/services/notifications.js`):

```javascript
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Request permission
export const requestNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Notification permission granted');
  }
};

// Get FCM token
export const getFCMToken = async () => {
  const token = await messaging().getToken();
  return token;
};

// Handle foreground notifications
messaging().onMessage(async remoteMessage => {
  PushNotification.localNotification({
    channelId: 'glucose-alerts',
    title: remoteMessage.notification.title,
    message: remoteMessage.notification.body,
    priority: 'high',
    importance: 'high',
  });
});
```

### **3. Biometric Authentication:**

```javascript
import ReactNativeBiometrics from 'react-native-biometrics';

export const authenticateWithBiometrics = async () => {
  const rnBiometrics = new ReactNativeBiometrics();

  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Confirm your identity',
  });

  return success;
};
```

---

## 📱 Example Screens

### **Login Screen:**

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', response.data.token);
      navigation.replace('Dashboard');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GlucoSense</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
```

---

## 🔔 Firebase Setup (for Push Notifications)

### **1. Create Firebase Project:**
1. Go to https://firebase.google.com/
2. Create new project "GlucoSense"
3. Add iOS and Android apps
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

### **2. Place Config Files:**
- **Android**: `android/app/google-services.json`
- **iOS**: `ios/GlucoSenseApp/GoogleService-Info.plist`

### **3. Configure Android** (`android/build.gradle`):
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
}
```

### **4. Configure iOS** (`ios/Podfile`):
```ruby
use_frameworks! :linkage => :static
```

---

## 🎨 Design System

### **Colors:**
```javascript
export const colors = {
  primary: '#0ea5e9',
  secondary: '#0284c7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  background: '#f8fafc',
  text: '#1e293b',
  textLight: '#64748b',
};
```

---

## 🚢 Building for Production

### **iOS (Mac only):**

```bash
# Open Xcode
open ios/GlucoSenseApp.xcworkspace

# Select "Any iOS Device" as target
# Product → Archive
# Distribute to App Store
```

### **Android:**

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📊 App Store Submission

### **Apple App Store:**
1. Create App Store Connect account
2. Create app listing
3. Upload screenshots (6.5" and 5.5")
4. Write description and keywords
5. Submit for review (takes 1-3 days)

### **Google Play Store:**
1. Create Google Play Console account ($25 one-time)
2. Create app listing
3. Upload screenshots
4. Complete content rating questionnaire
5. Submit for review (takes few hours)

---

## 📝 Next Steps

**To Build Full App:**
1. Run `npx react-native init GlucoSenseApp` in mobile-app folder
2. Install all dependencies
3. Implement screens (login, dashboard, monitor, etc.)
4. Integrate with backend API
5. Set up Firebase for notifications
6. Test on real devices
7. Submit to app stores

**Estimated Time:** 2-3 weeks of development

---

## 🆘 Troubleshooting

**Issue: Metro bundler won't start**
```bash
npm start -- --reset-cache
```

**Issue: iOS build fails**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Issue: Android build fails**
```bash
cd android
./gradlew clean
cd ..
```

---

Ready to build! The foundation is prepared. 🚀
