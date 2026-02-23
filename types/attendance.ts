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
  remoteTransumId?: number | null;
  typeTransum?: string | null;
  city?: string | null;
  source?: 'regular' | 'transum';
};

export type AttendanceProfile = {
  name: string;
  userId: number | null;
  officeId: number | null;
  domicile?: string | null;
  transportMode?: string | null;
};
