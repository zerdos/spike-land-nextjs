# Spike Land Mobile App

React Native mobile application for Spike Land's AI photo enhancement platform, built with Expo.

## Overview

This mobile app provides a native experience for:

- AI photo enhancement with multiple quality tiers
- Token-based usage system with regeneration
- Photo album management
- In-app purchases via RevenueCat
- OAuth and email/password authentication

### Platform Support

| Platform | Status                  |
| -------- | ----------------------- |
| iOS      | ✅ Supported            |
| Android  | ✅ Supported            |
| Web      | ✅ Supported (Expo Web) |

---

## Tech Stack

| Category       | Technology                                   |
| -------------- | -------------------------------------------- |
| Framework      | Expo 52, React Native 0.76                   |
| Navigation     | Expo Router (file-based)                     |
| UI             | Tamagui                                      |
| State          | Zustand                                      |
| Data Fetching  | React Query (@tanstack/react-query)          |
| Authentication | expo-auth-session (OAuth), expo-secure-store |
| Payments       | react-native-purchases (RevenueCat)          |
| Shared Code    | @spike-npm-land/shared                       |

---

## Prerequisites

- **Node.js** 20+ (see `.nvmrc` in project root)
- **Yarn** 4+ (Yarn Berry with workspaces)
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Development**: Xcode 15+ (Mac only)
- **Android Development**: Android Studio with emulator

---

## Getting Started

### 1. Install Dependencies

From the **project root**:

```bash
yarn install
```

### 2. Build Shared Package

The mobile app depends on `@spike-npm-land/shared`:

```bash
cd packages/shared
yarn build
cd ../mobile-app
```

### 3. Configure Environment

Create `.env` file in `packages/mobile-app/`:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://spike.land
EXPO_PUBLIC_API_KEY=your-api-key

# OAuth Providers (optional for local dev)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_APPLE_CLIENT_ID=your-apple-client-id

# RevenueCat (for in-app purchases)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your-ios-key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your-android-key
```

### 4. Start Development Server

```bash
cd packages/mobile-app

# Start Expo dev server
yarn start

# Or start directly on a platform:
yarn ios      # iOS Simulator
yarn android  # Android Emulator
yarn web      # Web Browser
```

---

## Project Structure

```
packages/mobile-app/
├── app/                    # Expo Router pages (file-based routing)
│   ├── _layout.tsx         # Root layout with providers
│   ├── (auth)/             # Auth screens group (sign-in, sign-up)
│   ├── (tabs)/             # Tab navigator screens
│   │   ├── index.tsx       # Home tab
│   │   ├── gallery.tsx     # Gallery tab
│   │   ├── merch.tsx       # Merchandise tab
│   │   └── profile.tsx     # Profile tab
│   ├── admin/              # Admin screens (analytics, jobs, vouchers)
│   ├── albums/             # Album management
│   ├── canvas/             # Image canvas/editing
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout flow
│   ├── enhance/            # Enhancement flow
│   ├── merch/              # Product details
│   ├── pricing.tsx         # Token packages
│   ├── referrals/          # Referral program
│   ├── settings/           # App settings
│   ├── tokens/             # Token management
│   └── voucher/            # Voucher redemption
│   └── storybook/          # Design system storybook (17 sections)
│
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI components
│   ├── gallery/            # Gallery-specific components
│   └── enhancement/        # Enhancement-related components
│
├── hooks/                  # Custom React hooks
│   ├── useEnhancement.ts   # Enhancement workflow hook
│   ├── useImagePicker.ts   # Camera/gallery image selection
│   ├── useReferralStats.ts # Referral program stats
│   └── useTokenBalance.ts  # Token balance management
│
├── services/               # API and business logic
│   ├── api/                # API endpoint modules
│   │   ├── albums.ts       # Album API calls
│   │   ├── images.ts       # Image API calls
│   │   ├── jobs.ts         # Enhancement job API
│   │   ├── merch.ts        # Merchandise API
│   │   ├── referrals.ts    # Referral API
│   │   └── tokens.ts       # Token API
│   ├── api-client.ts       # Base API client with auth
│   ├── auth.ts             # Authentication service
│   ├── purchases.ts        # RevenueCat integration
│   └── storage.ts          # Secure storage wrapper
│
├── stores/                 # Zustand state stores
│   ├── auth-store.ts       # Authentication state
│   ├── cart-store.ts       # Shopping cart state
│   ├── enhancement-store.ts# Enhancement workflow state
│   ├── gallery-store.ts    # Gallery/images state
│   └── token-store.ts      # Token balance state
│
├── constants/              # App constants
├── assets/                 # Static assets (images, fonts)
├── app.json                # Expo configuration
├── tamagui.config.ts       # Tamagui theme configuration
└── tsconfig.json           # TypeScript configuration
```

---

## Development Commands

| Command        | Description                        |
| -------------- | ---------------------------------- |
| `yarn start`   | Start Expo dev server with QR code |
| `yarn ios`     | Start on iOS Simulator             |
| `yarn android` | Start on Android Emulator          |
| `yarn web`     | Start in web browser               |
| `yarn lint`    | Run ESLint                         |
| `yarn test`    | Run Jest tests                     |

---

## Authentication Flow

The app supports multiple authentication methods:

### OAuth Providers

- **Google Sign-In** via `expo-auth-session`
- **Apple Sign-In** via `expo-auth-session` (iOS only)

### Email/Password

- Custom email/password authentication
- JWT tokens stored in `expo-secure-store`
- Auto-refresh on app launch

### Token Storage

```typescript
// services/storage.ts
import * as SecureStore from "expo-secure-store";

// Secure storage for native platforms
// Falls back to localStorage for web
```

---

## State Management

The app uses Zustand for state management with separate stores:

### Auth Store

```typescript
// stores/auth-store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

### Token Store

```typescript
// stores/token-store.ts
interface TokenState {
  balance: number;
  regenerationInfo: RegenerationInfo | null;
  fetchBalance: () => Promise<void>;
  deductTokens: (amount: number) => void;
}
```

### Enhancement Store

```typescript
// stores/enhancement-store.ts
interface EnhancementState {
  currentImage: ImageInfo | null;
  selectedTier: EnhancementTier;
  jobStatus: JobStatus | null;
  startEnhancement: () => Promise<void>;
}
```

---

## API Integration

The mobile app communicates with the web API at `spike.land`:

### Base Client

```typescript
// services/api-client.ts
const apiClient = {
  get: <T>(endpoint: string) => Promise<T>,
  post: <T>(endpoint: string, body: unknown) => Promise<T>,
  // Automatically includes Authorization header
  // Handles token refresh and error responses
};
```

### Key Endpoints

| Endpoint                       | Description           |
| ------------------------------ | --------------------- |
| `POST /api/auth/mobile/signin` | Mobile sign-in        |
| `GET /api/tokens/balance`      | Get token balance     |
| `POST /api/enhance`            | Start enhancement job |
| `GET /api/jobs/:id`            | Check job status      |
| `GET /api/images`              | List user images      |
| `GET /api/albums`              | List user albums      |

---

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Builds

```bash
# iOS (requires Xcode)
npx expo run:ios --configuration Release

# Android (requires Android Studio)
npx expo run:android --variant release
```

---

## Environment Variables

| Variable                             | Description            | Required |
| ------------------------------------ | ---------------------- | -------- |
| `EXPO_PUBLIC_API_URL`                | Backend API URL        | Yes      |
| `EXPO_PUBLIC_API_KEY`                | API authentication key | Yes      |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID`       | Google OAuth client ID | No       |
| `EXPO_PUBLIC_APPLE_CLIENT_ID`        | Apple OAuth client ID  | No       |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`     | RevenueCat iOS API key | No       |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Android key | No       |

---

## Troubleshooting

### Metro bundler issues

```bash
# Clear Metro cache
npx expo start --clear
```

### iOS Simulator not starting

```bash
# Install iOS simulator
npx expo install expo-dev-client
```

### Android emulator issues

```bash
# Ensure ANDROID_HOME is set
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Shared package changes not reflecting

```bash
# Rebuild shared package
cd packages/shared && yarn build
```

---

## Design System Storybook

The mobile app includes a comprehensive design system storybook at `/storybook` route, mirroring the web app's storybook at [localhost:3000/storybook](http://localhost:3000/storybook/components).

### Accessing the Storybook

```bash
# Start the Expo web server
cd packages/mobile-app
yarn web

# Navigate to http://localhost:8081/storybook
```

### Storybook Sections (17 total)

| Category   | Sections                            |
| ---------- | ----------------------------------- |
| Foundation | Brand, Colors, Typography, Surfaces |
| Actions    | Buttons                             |
| Elements   | Components, Comparison              |
| Data       | Data Display                        |
| Structure  | Layout                              |
| Status     | Feedback, Loading                   |
| Overlays   | Modals                              |
| Principles | Accessibility                       |
| Features   | Merch, PhotoMix                     |
| Systems    | Auth, Errors                        |

Each section demonstrates React Native components with proper styling matching the spike.land design system.

---

## Related Documentation

- [Shared Package README](../shared/README.md) - Shared types and utilities
- [API Reference](../../docs/API_REFERENCE.md) - Backend API documentation
- [Token System](../../docs/TOKEN_SYSTEM.md) - Token economics
- [Features](../../docs/FEATURES.md) - Platform features overview
