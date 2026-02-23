export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Office = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string;
};

export const FALLBACK_OFFICE: Office = {
  id: 0,
  name: 'Default Office',
  latitude: -6.200215,
  longitude: 106.816635,
  radius: 150,
  address: 'Default Address',
};

export const ALLOWED_RADIUS_METERS = 150;

export const ATTENDANCE_STORAGE_KEYS = {
  records: '@absensi/records',
  profile: '@absensi/profile',
} as const;

export const ATTENDANCE_TRANSUM_STORAGE_KEYS = {
  records: '@absensi/transum/records',
  profile: '@absensi/transum/profile',
} as const;

export const TRANSUM_DOMICILES = [
  'Jakarta Pusat',
  'Jakarta Timur',
  'Jakarta Utara',
  'Jakarta Barat',
  'Jakarta Selatan',
  'Bekasi',
  'Tangerang Selatan',
  'Tangerang',
  'Depok',
  'Bogor',
] as const;

export const TRANSUM_TRANSPORT_MODES = ['LRT', 'LRT Jakarta', 'MRT', 'Transjakarta', 'Jaklingko'] as const;

export const UI_COLORS = {
  primary: '#0F62FE',
  secondary: '#001D6C',
  accent: '#22D1B3',
  softBackground: '#F5F8FF',
};
