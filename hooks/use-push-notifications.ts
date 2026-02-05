import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Solicitar permissão
        PushNotifications.requestPermissions().then(result => {
            if (result.receive === 'granted') {
                // Registrar para receber notificações
                PushNotifications.register();
            }
        });

        // On success registration
        PushNotifications.addListener('registration', token => {
            console.log('Push registration success, token: ' + token.value);
            // Aqui você enviaria o token para o seu backend no Supabase
        });

        // On registration error
        PushNotifications.addListener('registrationError', error => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Action performed on notification
        PushNotifications.addListener('pushNotificationActionPerformed', action => {
            console.log('Push action performed: ' + JSON.stringify(action));
        });

        return () => {
            PushNotifications.removeAllListeners();
        };
    }, []);
};
