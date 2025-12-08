# TitanConnect Campus App

## Project Overview

TitanConnect is a native cross-platform mobile app for CSUF students to connect, discover events, and engage with their campus community.

**Platform**: Native iOS & Android app, exportable to web  
**Framework**: Expo Router + React Native

## Getting Started

### Prerequisites

- Node.js (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm)
- npm (comes bundled with Node.js)
- Expo Go app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

1. **Clone the repository**:
   ```bash
   git clone <YOUR_GIT_URL>
   cd titanconnect
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables (optional for Supabase)**:
   - The TitanConnect Supabase project URL and anon key are already configured in `lib/supabase.ts`
     for the main CSUF project, so you do **not** need to add them to `.env` / `.env.local` just to run
     the app.
   - If you want to point the app at a different Supabase project (e.g. your own dev/staging project),
     create a `.env.local` file and add:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - The client logs `Supabase client configured { supabaseUrl, anonKeyPresent }` at startup so you can
     confirm which project it is using. If the env URL looks invalid, the app falls back to the built-in
     TitanConnect project URL to avoid silent misconfiguration.

4. **Start the development server** (uses Expo's tunnel so Expo Go works on any network):
   ```bash
   npm start
   ```

5. **Run on your device**:
   - Scan the QR code with Expo Go (iOS) or the Expo Go app (Android)
   - Or press `i` for iOS Simulator, `a` for Android Emulator
    - Need LAN mode instead? Run `npm run start:lan`

## Available Scripts

- `npm start` - Start Expo development server with tunnel (best for real devices)
- `npm run start:lan` - Start in LAN mode
- `npm run start:web` - Start web version in browser
- `npm run start:ios` - Start iOS Simulator
- `npm run start:android` - Start Android Emulator
- `npm run lint` - Run ESLint

## Technologies Used

- **React Native** - Cross-platform native mobile development framework
- **Expo** - Platform and toolchain for React Native apps
- **Expo Router** - File-based routing system for React Native
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Backend as a Service (PostgreSQL database, authentication, real-time)
- **React Query** - Server state management
- **Lucide React Native** - Icon library

## App Features

- **Authentication** - CSUF email verification with Supabase
- **Social Feed** - Posts, likes, and comments
- **Events** - Discover and RSVP to campus events
- **Connections** - Connect with fellow Titans via QR code
- **Messaging** - Direct messaging between users
- **Profile** - Customizable user profiles

## Project Structure

```
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── _layout.tsx    # Tab layout configuration
│   │   ├── home.tsx       # Home feed
│   │   ├── events.tsx     # Events screen
│   │   ├── messages.tsx  # Messages screen
│   │   ├── tap-in.tsx    # QR code connection
│   │   └── profile.tsx   # User profile
│   ├── _layout.tsx        # Root layout
│   ├── welcome.tsx        # Welcome/login screen
│   ├── verify-email.tsx   # Email verification
│   ├── setup-profile.tsx  # Profile setup
│   └── chat/[id].tsx      # Individual chat screen
├── assets/                # Static assets
│   └── images/           # App icons and images
├── backend/               # Backend API (tRPC)
│   └── trpc/             # tRPC router setup
├── constants/            # App constants and configuration
├── contexts/             # React contexts (Auth, App state)
├── lib/                  # Utility libraries
│   ├── supabase.ts      # Supabase client
│   └── trpc.ts          # tRPC client
├── types/                # TypeScript type definitions
├── supabase/             # Supabase configuration
│   └── migrations/      # Database migrations
├── app.json             # Expo configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Supabase Setup

This app uses Supabase for authentication and database. See `SUPABASE_SETUP.md` for detailed setup instructions.

### Quick Setup

1. Create a Supabase project at [supabase.com](https://supabase.com) (or use the existing TitanConnect project).
2. Get your project URL and anon key from Settings → API if you are using your own project.
3. Either:
   - Update `lib/supabase.ts` with your project URL and anon key, **or**
   - Add them to `.env.local` as described above and adjust `lib/supabase.ts` if you want to allow overriding the default.
4. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL Editor

## Testing

### On Your Phone (Recommended)

1. **iOS**: Download [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
2. **Android**: Download [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. Run `npm start` and scan the QR code

### In Your Browser

Run `npm run start:web` to test in a web browser. Note: Some native features may not be available in the browser.

### iOS Simulator / Android Emulator

If you have Xcode (iOS) or Android Studio installed:

```bash
# iOS Simulator
npm run start:ios

# Android Emulator
npm run start:android
```

## Deployment

### Custom Development Builds

For production builds or advanced native features, you'll need to create a Custom Development Build:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure your project**:
   ```bash
   eas build:configure
   ```

3. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

4. **Build for Android**:
   ```bash
   eas build --platform android
   ```

For detailed instructions, visit:
- [Expo App Store deployment guide](https://docs.expo.dev/submit/ios/)
- [Expo Google Play deployment guide](https://docs.expo.dev/submit/android/)

### Web Deployment

Your app can also run on the web:

1. **Build for web**:
   ```bash
   eas build --platform web
   ```

2. **Deploy with EAS Hosting**:
   ```bash
   eas hosting:configure
   eas hosting:deploy
   ```

Alternative web deployment options:
- **Vercel**: Deploy directly from your GitHub repository
- **Netlify**: Connect your GitHub repo for automatic deployments

## Troubleshooting

### App not loading on device?

1. Make sure your phone and computer are on the same WiFi network
2. Try using tunnel mode: `npm run start:tunnel`
3. Check if your firewall is blocking the connection

### Build failing?

1. Clear your cache: `npx expo start --clear`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check [Expo's troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/)

### Need help?

- Check [Expo's documentation](https://docs.expo.dev/)
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started)
- Review [Supabase documentation](https://supabase.com/docs)

## License

Private project - All rights reserved

```
titanconnect
├─ app
│  ├─ (tabs)
│  │  ├─ commentStyles.ts
│  │  ├─ events.tsx
│  │  ├─ home.tsx
│  │  ├─ messages.tsx
│  │  ├─ profile.tsx
│  │  ├─ tap-in.tsx
│  │  └─ _layout.tsx
│  ├─ +not-found.tsx
│  ├─ api
│  │  ├─ comments
│  │  │  └─ route.ts
│  │  ├─ posts
│  │  │  └─ likes
│  │  │     └─ route.ts
│  │  └─ [...route]+api.ts
│  ├─ auth
│  │  └─ email-password.tsx
│  ├─ chat
│  │  └─ [id].tsx
│  ├─ components
│  ├─ index.tsx
│  ├─ post
│  │  └─ [id].tsx
│  ├─ setup-faculty.tsx
│  ├─ setup-profile.tsx
│  ├─ verify-email.tsx
│  ├─ welcome.tsx
│  └─ _layout.tsx
├─ app.json
├─ assets
│  └─ images
│     ├─ adaptive-icon.png
│     ├─ favicon.png
│     ├─ icon.png
│     └─ splash-icon.png
├─ backend
│  ├─ hono.ts
│  └─ trpc
│     ├─ app-router.ts
│     ├─ create-context.ts
│     └─ routes
│        ├─ example
│        │  └─ hi
│        │     └─ route.ts
│        └─ posts
│           └─ route.ts
├─ constants
│  └─ colors.ts
├─ contexts
│  ├─ AppContext.tsx
│  └─ AuthContext.tsx
├─ docs
│  ├─ bugfile.yml
│  └─ testcases.yml
├─ env.local.template
├─ eslint.config.js
├─ gitignore
├─ lib
│  ├─ responsive.ts
│  ├─ storage.ts
│  ├─ supabase.ts
│  └─ trpc.ts
├─ mocks
│  └─ data.ts
├─ package-lock.json
├─ package.json
├─ README.md
├─ styles
│  └─ profile.styles.ts
├─ supabase
│  ├─ config.toml
│  └─ migrations
│     ├─ 20251118053602_remote_schema.sql
│     ├─ 20251118102717_add-role-to-profiles.sql
│     └─ 20251202000000_storage_setup.sql
├─ supabase-schema.sql
├─ SUPABASE_SETUP.md
├─ tsconfig.json
└─ types
   └─ index.ts

```