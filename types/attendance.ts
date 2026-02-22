import type { Coordinates } from '@/constants/attendance';

export type AttendanceRecord = {
  id: string;
  name: string;
  userId: number | null;
  checkIn: string;
  checkOut?: string;
  officeId: number | null;
  officeName?: string;
  checkInLocation: Coordinates & { accuracy?: number };
  checkOutLocation?: Coordinates & { accuracy?: number };
  checkInSelfieUri?: string;
  checkOutSelfieUri?: string;
};

export type AttendanceProfile = {
  name: string;
  userId: number | null;
  officeId: number | null;
};
