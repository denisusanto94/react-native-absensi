import { Platform, PermissionsAndroid } from 'react-native';
import type { Permission } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

type EnsureMode = 'check' | 'request';

export type MandatoryPermissionKey = 'location' | 'camera' | 'microphone' | 'photos' | 'call';

export type MandatoryPermissionStatus = {
  key: MandatoryPermissionKey;
  label: string;
  granted: boolean;
  platform: 'android' | 'ios' | 'both';
};

const unique = <T,>(values: (T | null | undefined)[]): T[] =>
  values.filter((value, index, self): value is T => Boolean(value) && self.indexOf(value) === index);

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

const ensureMediaPermission = async (mode: EnsureMode) => {
  const status =
    mode === 'request'
      ? await MediaLibrary.requestPermissionsAsync()
      : await MediaLibrary.getPermissionsAsync();
  return status?.status === 'granted';
};

const ensureAndroidPermissions = async (mode: EnsureMode, permissions: Permission[]) => {
  if (Platform.OS !== 'android' || permissions.length === 0) {
    return true;
  }

  if (mode === 'request') {
    const result = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(
      (permission) =>
        result[permission as keyof typeof result] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const checks = await Promise.all(permissions.map((permission) => PermissionsAndroid.check(permission)));
  return checks.every(Boolean);
};

const ensureCallPermission = async (mode: EnsureMode) => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const callPermission = PermissionsAndroid.PERMISSIONS.CALL_PHONE as Permission | undefined;
  if (!callPermission) {
    return true;
  }
  if (mode === 'request') {
    const result = await PermissionsAndroid.request(callPermission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return PermissionsAndroid.check(callPermission);
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
  await register('photos', 'Foto / Galeri', 'both', () => ensureMediaPermission(mode));
  await register('call', 'Telepon', 'android', () => ensureCallPermission(mode));

  return statuses;
};

export const checkMandatoryPermissions = () => buildStatuses('check');

export const requestMandatoryPermissions = () => buildStatuses('request');

export const areMandatoryPermissionsGranted = (statuses: MandatoryPermissionStatus[]) =>
  statuses.every((status) => status.granted);
