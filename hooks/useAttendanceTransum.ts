import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ATTENDANCE_TRANSUM_STORAGE_KEYS,
  FALLBACK_OFFICE,
  type Coordinates,
  type Office,
} from '@/constants/attendance';
import { useAuth } from '@/hooks/useAuth';
import type { AttendanceProfile, AttendanceRecord } from '@/types/attendance';
import { api, type OfficeResponse } from '@/utils/api';

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type CheckPayload = {
  coordinates: Coordinates & { accuracy?: number };
  selfieUri: string;
};

const mapOffice = (office: OfficeResponse): Office => ({
  id: office.id,
  name: office.office_name,
  latitude: Number(office.latitude),
  longitude: Number(office.longitude),
  radius: Number(office.radius_meter),
  address: office.address,
});

export const useAttendanceTransum = () => {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<AttendanceProfile>({
    name: user?.email ?? 'Pengguna',
    userId: user?.id ?? null,
    officeId: null,
  });
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);

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

  const refreshOffices = useCallback(async () => {
    if (!token) {
      setOffices([]);
      setProfile((prev) => ({
        ...prev,
        officeId: null,
      }));
      return;
    }
    setOfficesLoading(true);
    try {
      const response = await api.getOffices(token);
      const mapped = response.map(mapOffice);
      setOffices(mapped);
      setProfile((prev) => ({
        ...prev,
        officeId: prev.officeId ?? mapped[0]?.id ?? null,
      }));
    } catch (error) {
      console.warn('Gagal memuat daftar kantor transum', error);
    } finally {
      setOfficesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshOffices();
  }, [refreshOffices]);

  const updateProfile = useCallback((patch: Partial<AttendanceProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const activeRecord = useMemo(() => records.find((record) => !record.checkOut), [records]);

  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === profile.officeId) ?? null,
    [offices, profile.officeId]
  );

  const ensureAuthReady = useCallback(() => {
    if (!token || !user?.id) {
      throw new Error('Sesi login kedaluwarsa, silakan masuk kembali.');
    }
    if (!profile.officeId) {
      throw new Error('Pilih kantor terlebih dahulu.');
    }
  }, [profile.officeId, token, user?.id]);

  const checkIn = useCallback(
    async ({ coordinates, selfieUri }: CheckPayload) => {
      if (activeRecord) {
        throw new Error('Kamu sudah melakukan check-in transum.');
      }
      ensureAuthReady();
      if (!token || !user) {
        throw new Error('Sesi login tidak valid.');
      }

      await api.checkInTransum(token, {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

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

      const officeSnapshot = selectedOffice ?? FALLBACK_OFFICE;
      const newRecord: AttendanceRecord = {
        id: generateId(),
        name: user.email,
        userId: user.id,
        officeId: officeSnapshot.id,
        officeName: officeSnapshot.name,
        checkIn: new Date().toISOString(),
        checkInLocation: coordinates,
        checkInSelfieUri: selfieUri,
      };

      setRecords((prev) => [newRecord, ...prev]);
    },
    [activeRecord, ensureAuthReady, selectedOffice, token, user]
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

      await api.checkOutTransum(token, {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
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

      const checkOutTimestamp = new Date().toISOString();
      const targetId = activeRecord.id;
      setRecords((prev) =>
        prev.map((record) =>
          record.id === targetId
            ? {
                ...record,
                checkOut: checkOutTimestamp,
                checkOutLocation: coordinates,
                checkOutSelfieUri: selfieUri,
              }
            : record
        )
      );
    },
    [activeRecord, ensureAuthReady, token, user]
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
    offices,
    officesLoading,
    selectedOffice,
    activeRecord,
    summary,
    refreshOffices,
    updateProfile,
    checkIn,
    checkOut,
  };
};
