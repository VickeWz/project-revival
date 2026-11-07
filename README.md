# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## iPhone motion tracking

The checked-in `plugins/gamerun-motion` package supplies a native Core Motion
`CMPedometer` bridge. Active passes use its cumulative step and estimated walking
distance events, with HealthKit as fallback. The two sources are never added
together. Earned minutes still use one minute per complete 200 steps; final saved
rewards remain based on the bounded HealthKit read, which can arrive later than
motion data. iOS controls event timing; updates on every footstep are not guaranteed.

On your Mac, after pulling these changes:

```sh
npm install
# Only if the ios directory does not exist:
npx cap add ios
npm run ios
npx cap open ios
```

`npm run ios` builds and syncs the local plugin, then adds motion and Health read
privacy descriptions to `ios/App/App/Info.plist` without replacing custom text.
Core Motion does not require a separate Signing & Capabilities entry. Enable
**HealthKit** there, select your signing team, and run on a physical iPhone.
Allow Motion & Fitness and Health step/distance reads. Test an active pass,
background/resume, permission denial, and completing the pass. GPS is not used.

This repository still uses bundled Capacitor web screens with native sensor
plugins; this change does not convert the interface into a pure Swift iOS app.
Swift compilation and real-device sensor timing require Xcode and an iPhone and
cannot be verified in the Linux Lovable environment.
