import dataset from "@/utils/data.json";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

type RawOffice = {
  type: string;
  lat: string;
  long: string;
  address: string;
  telp: string;
};

type RawEmployee = {
  name: string;
  userid: string;
};

type RawDataset = {
  office?: RawOffice[];
  employe?: RawEmployee[];
};

const root: RawDataset = (dataset.data && dataset.data[0]) || {};

export const OFFICES = (root.office ?? []).map((office) => ({
  type: office.type,
  latitude: Number(office.lat),
  longitude: Number(office.long),
  address: office.address,
  telp: office.telp,
}));

export const EMPLOYEES = root.employe ?? [];

const FALLBACK_OFFICE = {
  type: "default",
  latitude: -6.200215,
  longitude: 106.816635,
  address: "Default Office",
  telp: "-",
};

export const DEFAULT_OFFICE =
  OFFICES.find((office) => office.type === "head-office") ??
  OFFICES[0] ??
  FALLBACK_OFFICE;

export const DEFAULT_EMPLOYEE =
  EMPLOYEES[0] ?? { name: "Guest", userid: "guest" };

export const ALLOWED_RADIUS_METERS = 150;

export const ATTENDANCE_STORAGE_KEYS = {
  records: "@absensi/records",
  profile: "@absensi/profile",
} as const;

export const UI_COLORS = {
  primary: "#0F62FE",
  secondary: "#001D6C",
  accent: "#22D1B3",
  softBackground: "#F5F8FF",
};
