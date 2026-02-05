import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface BiometricResult {
    isAvailable: boolean;
    type?: string;
    error?: string;
}

export const checkBiometry = async (): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
        return { isAvailable: false, error: 'Not a native platform' };
    }

    try {
        const result = await NativeBiometric.isAvailable();
        let type = 'Biometrics';

        if (result.biometryType === BiometryType.FACE_ID) {
            type = 'Face ID';
        } else if (result.biometryType === BiometryType.TOUCH_ID || result.biometryType === BiometryType.FINGERPRINT) {
            type = 'Touch ID / Fingerprint';
        }

        return { isAvailable: true, type };
    } catch (error: any) {
        console.warn('Biometry not available:', error);
        return { isAvailable: false, error: error.message };
    }
};

export const authenticate = async (reason: string = 'Autentique-se para continuar'): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
        return true; // Simulate success on web for easier dev
    }

    try {
        const isAvail = await NativeBiometric.isAvailable();
        if (!isAvail.isAvailable) return false;

        await NativeBiometric.verifyIdentity({
            reason,
            title: 'Autenticação Biométrica',
            subtitle: 'Use sua biometria para acessar o Phantom',
            description: 'Proteja suas conversas secretas',
        });

        return true;
    } catch (error) {
        console.error('Biometric authentication failed:', error);
        return false;
    }
};

/**
 * Saves credentials for later biometric login (auto-login feature)
 */
export const setBiometricCredentials = async (username: string, password: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await NativeBiometric.setCredentials({
            username,
            password,
            server: 'phantom.chat',
        });
    } catch (error) {
        console.error('Failed to set biometric credentials:', error);
    }
};

/**
 * Gets credentials after successful biometric check
 */
export const getBiometricCredentials = async (): Promise<{ username: string; password: string } | null> => {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        const credentials = await NativeBiometric.getCredentials({
            server: 'phantom.chat',
        });
        return credentials;
    } catch (error) {
        console.error('Failed to get biometric credentials:', error);
        return null;
    }
};

export const deleteBiometricCredentials = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await NativeBiometric.deleteCredentials({
            server: 'phantom.chat',
        });
    } catch (error) {
        console.error('Failed to delete biometric credentials:', error);
    }
};
