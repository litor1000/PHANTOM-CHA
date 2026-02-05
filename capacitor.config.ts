import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'chat.phantom.app',
    appName: 'Phantom Chat',
    webDir: 'out',
    plugins: {
        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"],
        },
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#000000",
            showSpinner: true,
            androidSpinnerStyle: "large",
            iosSpinnerStyle: "small",
            spinnerColor: "#A855F7",
        },
    },
    server: {
        androidScheme: 'https'
    }
};

export default config;
