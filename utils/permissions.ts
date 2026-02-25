import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

type EnsureMode = 'check' | 'request';

export type MandatoryPermissionKey = 'location' | 'camera' | 'microphone';

export type MandatoryPermissionStatus = {
  key: MandatoryPermissionKey;
  label: string;
  granted: boolean;
  platform: 'android' | 'ios' | 'both';
};

const ensureLocationPermission = async (mode: EnsureMode) => {
  const status =
    mode === 'request'
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
  return status.status === 'granted';
};

const ensureCameraPermission = async (mode: EnsureMode) => {
  const status =
    mode === 'request'
      ? await Camera.requestCameraPermissionsAsync()
      : await Camera.getCameraPermissionsAsync();
  return status?.status === 'granted';
};

const ensureMicrophonePermission = async (mode: EnsureMode) => {
  const status =
    mode === 'request'
      ? await Camera.requestMicrophonePermissionsAsync()
      : await Camera.getMicrophonePermissionsAsync();
  return status?.status === 'granted';
};

const buildStatuses = async (mode: EnsureMode): Promise<MandatoryPermissionStatus[]> => {
  const statuses: MandatoryPermissionStatus[] = [];

  const register = async (
    key: MandatoryPermissionKey,
    label: string,
    platform: MandatoryPermissionStatus['platform'],
    ensureFn: () => Promise<boolean>
  ) => {
    try {
      const granted = await ensureFn();
      statuses.push({ key, label, granted, platform });
    } catch (error) {
      console.warn(`Permission check failed for ${key}`, error);
      statuses.push({ key, label, granted: false, platform });
    }
  };

  await register('location', 'Lokasi (GPS)', 'both', () => ensureLocationPermission(mode));
  await register('camera', 'Kamera', 'both', () => ensureCameraPermission(mode));
  await register('microphone', 'Mikrofon', 'both', () => ensureMicrophonePermission(mode));

  return statuses;
};

export const checkMandatoryPermissions = () => buildStatuses('check');

export const requestMandatoryPermissions = () => buildStatuses('request');

export const areMandatoryPermissionsGranted = (statuses: MandatoryPermissionStatus[]) =>
  statuses.every((status) => status.granted);
