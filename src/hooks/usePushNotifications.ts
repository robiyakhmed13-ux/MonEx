import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

export const usePushNotifications = () => {
  const { user, isAuthenticated } = useApp();
  const registrationAttempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || registrationAttempted.current) return;
    
    // Only register on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on native platforms');
      return;
    }

    registrationAttempted.current = true;
    registerPushNotifications(user.id);
  }, [isAuthenticated, user?.id]);

  const registerPushNotifications = async (userId: string) => {
    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Register for push
      await PushNotifications.register();

      // Listen for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value);
        await saveDeviceToken(userId, token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
      });

      // Listen for notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        handleNotificationAction(action.notification.data);
      });

    } catch (error) {
      console.error('Failed to register push notifications:', error);
    }
  };

  const saveDeviceToken = async (userId: string, token: string) => {
    try {
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 
                       Capacitor.getPlatform() === 'android' ? 'android' : 'web';
      
      // Save token to profiles or local storage for now
      // Note: upsert_device_token RPC function needs to be created if push tokens need to be stored
      console.log('Device token to save:', token, 'for user:', userId, 'platform:', platform);
      
      // For now, just log success - implement storage when needed
      console.log('Device token registered successfully');
    } catch (err) {
      console.error('Error saving device token:', err);
    }
  };

  const handleNotificationAction = (data: any) => {
    if (data?.action) {
      // Handle different actions
      switch (data.action) {
        case 'open_copilot':
          window.location.hash = '#copilot';
          break;
        case 'set_limit':
          window.location.hash = '#limits';
          break;
        case 'view_transactions':
          window.location.hash = '#transactions';
          break;
        case 'view_goals':
          window.location.hash = '#goals';
          break;
      }
    }
  };

  return null;
};

