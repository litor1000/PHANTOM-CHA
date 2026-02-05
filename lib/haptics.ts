import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const triggerImpact = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Haptics.impact({ style });
        } catch (e) {
            console.warn('Haptics not available', e);
        }
    }
};

export const triggerNotification = async (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Haptics.notification({ type });
        } catch (e) {
            console.warn('Haptics not available', e);
        }
    }
};

export const SelectionChanged = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Haptics.selectionChanged();
        } catch (e) {
            console.warn('Haptics not available', e);
        }
    }
};
