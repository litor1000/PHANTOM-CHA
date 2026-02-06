import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { updateUserProfile } from '@/lib/supabase/auth';

export const usePushNotifications = (userId: string | undefined) => {
    useEffect(() => {
        if (!Capacitor.isNativePlatform() || !userId || userId === 'current-user') return;

        // Solicitar permissão
        PushNotifications.requestPermissions().then(result => {
            if (result.receive === 'granted') {
                // Registrar para receber notificações
                PushNotifications.register();
            }
        });

        // On success registration
        PushNotifications.addListener('registration', async token => {
            console.log('Push registration success, token: ' + token.value);
            // Salvar o token no perfil do usuário no Supabase
            await updateUserProfile(userId, { fcm_token: token.value });
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
    }, [userId]);
};
