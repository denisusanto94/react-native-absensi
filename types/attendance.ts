import type { Coordinates } from "@/constants/attendance";

export type AttendanceRecord = {
  id: string;
  name: string;
  userId: string;
  checkIn: string;
  checkOut?: string;
  officeType: string;
  checkInLocation: Coordinates & { accuracy?: number };
  checkOutLocation?: Coordinates & { accuracy?: number };
  checkInSelfieUri?: string;
  checkOutSelfieUri?: string;
};

export type AttendanceProfile = {
  name: string;
  userId: string;
  officeType: string;
};
