import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  getTrackingStatus,
  requestTrackingPermission,
  type TrackingStatus,
} from 'react-native-tracking-transparency';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_STATUS_KEY = '@tracking_transparency_status';
const TRACKING_REQUESTED_KEY = '@tracking_transparency_requested';

/**
 * Hook to manage App Tracking Transparency (ATT) for iOS
 * 
 * Best practices implemented:
 * - Only requests permission when status is 'not-determined'
 * - Stores status to avoid repeated requests
 * - Handles all authorization statuses gracefully
 * - Platform-specific (iOS only)
 * 
 * @returns Object with tracking status and request function
 */
export const useTrackingTransparency = () => {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [isRequested, setIsRequested] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load stored status on mount
  useEffect(() => {
    const loadStoredStatus = async () => {
      if (Platform.OS !== 'ios') {
        setIsLoading(false);
        return;
      }

      try {
        // Check if we've already requested permission
        const requested = await AsyncStorage.getItem(TRACKING_REQUESTED_KEY);
        setIsRequested(requested === 'true');

        // Get current tracking status
        const status = await getTrackingStatus();
        setTrackingStatus(status);

        // Store the status
        await AsyncStorage.setItem(TRACKING_STATUS_KEY, status);
      } catch (error) {
        console.error('[useTrackingTransparency] Error loading status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredStatus();
  }, []);

  /**
   * Request tracking permission
   * Only requests if status is 'not-determined' and hasn't been requested before
   * 
   * @returns Promise with the new tracking status
   */
  const requestTracking = useCallback(async (): Promise<TrackingStatus | null> => {
    if (Platform.OS !== 'ios') {
      console.log('[useTrackingTransparency] Tracking transparency is iOS only');
      return null;
    }

    if (isRequested) {
      console.log('[useTrackingTransparency] Permission already requested');
      return trackingStatus;
    }

    try {
      setIsLoading(true);
      const currentStatus = await getTrackingStatus();

      // Only request if status is 'not-determined'
      if (currentStatus === 'not-determined') {
        console.log('[useTrackingTransparency] Requesting tracking permission...');
        const newStatus = await requestTrackingPermission();
        setTrackingStatus(newStatus);
        setIsRequested(true);

        // Store the status and requested flag
        await AsyncStorage.setItem(TRACKING_STATUS_KEY, newStatus);
        await AsyncStorage.setItem(TRACKING_REQUESTED_KEY, 'true');

        console.log('[useTrackingTransparency] Tracking permission result:', newStatus);
        return newStatus;
      } else {
        // Status is already determined (authorized, denied, restricted, or unavailable)
        setTrackingStatus(currentStatus);
        setIsRequested(true);
        await AsyncStorage.setItem(TRACKING_STATUS_KEY, currentStatus);
        await AsyncStorage.setItem(TRACKING_REQUESTED_KEY, 'true');
        return currentStatus;
      }
    } catch (error) {
      console.error('[useTrackingTransparency] Error requesting permission:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isRequested, trackingStatus]);

  /**
   * Check if tracking is authorized
   */
  const isAuthorized = trackingStatus === 'authorized';

  /**
   * Check if tracking is available (not restricted or unavailable)
   */
  const isAvailable = trackingStatus !== 'restricted' && trackingStatus !== 'unavailable';

  return {
    trackingStatus,
    isAuthorized,
    isAvailable,
    isRequested,
    isLoading,
    requestTracking,
  };
};

