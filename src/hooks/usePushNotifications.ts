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
      PushNotifications.addListener('registration', async (token: PushNotificationSchema) => {
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
      
      const { error } = await supabase.rpc('upsert_device_token', {
        p_user_id: userId,
        p_device_token: token,
        p_platform: platform,
        p_device_id: null, // Can be enhanced with device ID if needed
        p_app_version: null, // Can be enhanced with app version
      });

      if (error) {
        console.error('Failed to save device token:', error);
      } else {
        console.log('Device token saved successfully');
      }
    } catch (error) {
      console.error('Error saving device token:', error);
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

