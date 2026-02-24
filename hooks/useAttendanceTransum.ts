import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ATTENDANCE_TRANSUM_STORAGE_KEYS,
  TRANSUM_DOMICILES,
  TRANSUM_TRANSPORT_MODES,
  type Coordinates,
} from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';
import type { AttendanceProfile, AttendanceRecord } from '@/types/attendance';
import { api } from '@/utils/api';

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type CheckPayload = {
  coordinates: Coordinates & { accuracy?: number };
  selfieUri: string;
};

const DEFAULT_DOMICILE = TRANSUM_DOMICILES[0];
const DEFAULT_TRANSPORT = TRANSUM_TRANSPORT_MODES[0];

export const useAttendanceTransum = () => {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<AttendanceProfile>({
    name: user?.email ?? 'Pengguna',
    userId: user?.id ?? null,
    officeId: null,
    domicile: DEFAULT_DOMICILE,
    transportMode: DEFAULT_TRANSPORT,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [rawRecords, rawProfile] = await Promise.all([
          AsyncStorage.getItem(ATTENDANCE_TRANSUM_STORAGE_KEYS.records),
          AsyncStorage.getItem(ATTENDANCE_TRANSUM_STORAGE_KEYS.profile),
        ]);

        if (rawRecords) {
          setRecords(JSON.parse(rawRecords));
        }
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          setProfile((prev) => ({
            ...prev,
            officeId: parsed.officeId ?? null,
            domicile: parsed.domicile ?? DEFAULT_DOMICILE,
            transportMode: parsed.transportMode ?? DEFAULT_TRANSPORT,
          }));
        }
      } catch (error) {
        console.warn('Unable to hydrate transum attendance state', error);
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      name: user?.email ?? 'Pengguna',
      userId: user?.id ?? null,
    }));
  }, [user?.email, user?.id]);

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(ATTENDANCE_TRANSUM_STORAGE_KEYS.records, JSON.stringify(records)).catch(
      (error) => console.warn('Failed to persist transum records', error)
    );
  }, [loading, records]);

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(ATTENDANCE_TRANSUM_STORAGE_KEYS.profile, JSON.stringify(profile)).catch(
      (error) => console.warn('Failed to persist transum profile', error)
    );
  }, [loading, profile]);

  const updateProfile = useCallback((patch: Partial<AttendanceProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const activeRecord = useMemo(() => records.find((record) => !record.checkOut), [records]);

  const ensureAuthReady = useCallback(() => {
    if (!token || !user?.id) {
      throw new Error('Sesi login kedaluwarsa, silakan masuk kembali.');
    }
    if (!profile.domicile || !profile.transportMode) {
      throw new Error('Pilih domisili dan moda transportasi terlebih dahulu.');
    }
  }, [profile.domicile, profile.transportMode, token, user?.id]);

  const checkIn = useCallback(
    async ({ coordinates, selfieUri }: CheckPayload) => {
      if (activeRecord) {
        throw new Error('Kamu sudah melakukan check-in transum.');
      }
      ensureAuthReady();
      if (!token || !user) {
        throw new Error('Sesi login tidak valid.');
      }

      const checkInTimestamp = new Date().toISOString();
      const checkInPayload = {
        user_id: user.id,
        check_in: checkInTimestamp,
        check_in_lat: String(coordinates.latitude),
        check_in_long: String(coordinates.longitude),
        check_out: null,
        check_out_lat: null,
        check_out_long: null,
        type_transum: profile.transportMode ?? DEFAULT_TRANSPORT,
        city: profile.domicile ?? DEFAULT_DOMICILE,
      };

      const creation = await api.createTransumAttendance(token, checkInPayload);
      const remoteId = creation.id;
      if (!remoteId) {
        throw new Error('Gagal membuat sesi transum di server.');
      }

      if (selfieUri) {
        try {
          await api.uploadTransumPhotoCheckIn(token, selfieUri);
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? `Upload foto transum check-in gagal: ${error.message}`
              : 'Upload foto transum check-in gagal.'
          );
        }
      }

      const newRecord: AttendanceRecord = {
        id: generateId(),
        name: user.email,
        userId: user.id,
        officeId: null,
        officeName: checkInPayload.city ?? undefined,
        checkIn: checkInTimestamp,
        checkInLocation: coordinates,
        checkInSelfieUri: selfieUri,
        remoteTransumId: remoteId,
        typeTransum: checkInPayload.type_transum,
        city: checkInPayload.city,
        source: 'transum',
      };

      setRecords((prev) => [newRecord, ...prev]);
    },
    [activeRecord, ensureAuthReady, profile.domicile, profile.transportMode, token, user]
  );

  const checkOut = useCallback(
    async ({ coordinates, selfieUri }: CheckPayload) => {
      if (!activeRecord) {
        throw new Error('Belum ada sesi check-in transum aktif.');
      }
      ensureAuthReady();
      if (!token || !user) {
        throw new Error('Sesi login tidak valid.');
      }

      const remoteId = activeRecord.remoteTransumId;
      if (!remoteId) {
        throw new Error('Sesi transum tidak ditemukan. Silakan check-in ulang.');
      }

      const checkInLocation = activeRecord.checkInLocation;
      if (!checkInLocation) {
        throw new Error('Data lokasi check-in tidak ditemukan. Silakan lakukan check-in ulang sebelum check-out.');
      }

      const checkOutTimestamp = new Date().toISOString();
      const activeCheckInLat = checkInLocation.latitude;
      const activeCheckInLong = checkInLocation.longitude;
      const typeTransum = activeRecord.typeTransum ?? profile.transportMode ?? DEFAULT_TRANSPORT;
      const city = activeRecord.city ?? profile.domicile ?? DEFAULT_DOMICILE;

      await api.updateTransumAttendance(token, remoteId, {
        user_id: user.id,
        check_in: activeRecord.checkIn,
        check_in_lat: String(activeCheckInLat),
        check_in_long: String(activeCheckInLong),
        check_out: checkOutTimestamp,
        check_out_lat: String(coordinates.latitude),
        check_out_long: String(coordinates.longitude),
        type_transum: typeTransum,
        city,
      });

      if (selfieUri) {
        try {
          await api.uploadTransumPhotoCheckOut(token, selfieUri);
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? `Upload foto transum check-out gagal: ${error.message}`
              : 'Upload foto transum check-out gagal.'
          );
        }
      }

      const targetId = activeRecord.id;
      setRecords((prev) =>
        prev.map((record) =>
          record.id === targetId
            ? {
                ...record,
                checkOut: checkOutTimestamp,
                checkOutLocation: coordinates,
                checkOutSelfieUri: selfieUri,
                typeTransum,
                city,
              }
            : record
        )
      );
    },
    [activeRecord, ensureAuthReady, profile.domicile, profile.transportMode, token, user]
  );

  const todayKey = new Date().toDateString();
  const todaysRecords = useMemo(
    () => records.filter((record) => new Date(record.checkIn).toDateString() === todayKey),
    [records, todayKey]
  );

  const summary = useMemo(() => {
    const uniqueDays = new Set(records.map((record) => new Date(record.checkIn).toDateString()));
    const completed = records.filter((record) => record.checkOut).length;

    return {
      totalDays: uniqueDays.size,
      completedSessions: completed,
      openSessions: records.length - completed,
      todaysRecords,
    };
  }, [records, todaysRecords]);

  return {
    records,
    profile,
    loading,
    activeRecord,
    summary,
    updateProfile,
    checkIn,
    checkOut,
  };
};
