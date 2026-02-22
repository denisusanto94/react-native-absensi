import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ATTENDANCE_STORAGE_KEYS,
  DEFAULT_EMPLOYEE,
  DEFAULT_OFFICE,
  type Coordinates,
} from "@/constants/attendance";
import type { AttendanceProfile, AttendanceRecord } from "@/types/attendance";

const initialProfile: AttendanceProfile = {
  name: DEFAULT_EMPLOYEE.name,
  userId: DEFAULT_EMPLOYEE.userid,
  officeType: DEFAULT_OFFICE.type,
};

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type CheckPayload = {
  coordinates: Coordinates & { accuracy?: number };
  selfieUri: string;
};

export const useAttendance = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<AttendanceProfile>(initialProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [rawRecords, rawProfile] = await Promise.all([
          AsyncStorage.getItem(ATTENDANCE_STORAGE_KEYS.records),
          AsyncStorage.getItem(ATTENDANCE_STORAGE_KEYS.profile),
        ]);

        if (rawRecords) {
          setRecords(JSON.parse(rawRecords));
        }

        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          setProfile({
            name: parsed.name ?? initialProfile.name,
            userId: parsed.userId ?? initialProfile.userId,
            officeType: parsed.officeType ?? initialProfile.officeType,
          });
        } else {
          setProfile(initialProfile);
        }
      } catch (error) {
        console.warn("Unable to hydrate attendance state", error);
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      ATTENDANCE_STORAGE_KEYS.records,
      JSON.stringify(records)
    ).catch((error) =>
      console.warn("Failed to persist attendance records", error)
    );
  }, [loading, records]);

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      ATTENDANCE_STORAGE_KEYS.profile,
      JSON.stringify(profile)
    ).catch((error) => console.warn("Failed to persist profile", error));
  }, [loading, profile]);

  const updateProfile = useCallback((patch: Partial<AttendanceProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const activeRecord = useMemo(
    () => records.find((record) => !record.checkOut),
    [records]
  );

  const checkIn = useCallback(
    async ({ coordinates, selfieUri }: CheckPayload) => {
      if (activeRecord) {
        throw new Error("Kamu sudah melakukan check-in.");
      }

      const newRecord: AttendanceRecord = {
        id: generateId(),
        name: profile.name,
        userId: profile.userId,
        officeType: profile.officeType,
        checkIn: new Date().toISOString(),
        checkInLocation: coordinates,
        checkInSelfieUri: selfieUri,
      };

      setRecords((prev) => [newRecord, ...prev]);
    },
    [activeRecord, profile.name, profile.officeType, profile.userId]
  );

  const checkOut = useCallback(
    async ({ coordinates, selfieUri }: CheckPayload) => {
      if (!activeRecord) {
        throw new Error("Belum ada sesi check-in aktif.");
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.id === activeRecord.id
            ? {
                ...record,
                checkOut: new Date().toISOString(),
                checkOutLocation: coordinates,
                checkOutSelfieUri: selfieUri,
              }
            : record
        )
      );
    },
    [activeRecord]
  );

  const todayKey = new Date().toDateString();
  const todaysRecords = useMemo(
    () =>
      records.filter(
        (record) => new Date(record.checkIn).toDateString() === todayKey
      ),
    [records, todayKey]
  );

  const summary = useMemo(() => {
    const uniqueDays = new Set(
      records.map((record) => new Date(record.checkIn).toDateString())
    );

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
