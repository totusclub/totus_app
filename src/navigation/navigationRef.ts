import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Root navigation ref — used by the floating AI chat (outside screen tree)
 * to open hotel details.
 */
export const navigationRef = createNavigationContainerRef();

export function navigateRoot(name: string, params?: object) {
  if (navigationRef.isReady()) {
    // Root AuthStack screens (e.g. hotelFromAi)
    (navigationRef as any).navigate(name, params);
  }
}
