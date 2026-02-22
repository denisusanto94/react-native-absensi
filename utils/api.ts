import { API_BASE_URL } from "@/constants/config";

type ApiErrorBody = {
  message?: string;
  error?: string;
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(buildUrl(path), init);
  const payload = await parseResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | string | null;
    const message =
      typeof body === "string"
        ? body
        : body?.message ?? body?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
};

export type LoginUserPayload = {
  id_user?: number;
  id?: number;
  email?: string;
  roles?: string;
  role?: string;
  divisi?: string;
  division?: string;
};

export type LoginResponse = LoginUserPayload & {
  token?: string | null;
  access_token?: string | null;
  data?:
    | (LoginUserPayload & {
        token?: string | null;
        access_token?: string | null;
        user?: LoginUserPayload;
      })
    | null;
};

export type OfficeResponse = {
  id: number;
  office_name: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  address: string;
};

export type SubmitAttendancePayload = {
  id_user: number;
  office_id: number;
  check_in: string;
  check_in_lat: string;
  check_in_long: string;
  check_out: string;
  check_out_lat: string;
  check_out_long: string;
};

export type CoordinatesPayload = {
  latitude: number;
  longitude: number;
};

const authHeaders = (token?: string) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

export const api = {
  loginUser: (email: string, password: string) =>
    request<LoginResponse>("/auth/login_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
  getOffices: (token: string) =>
    request<OfficeResponse[]>("/offices", {
      method: "GET",
      headers: {
        ...(authHeaders(token) ?? {}),
      },
    }),
  checkIn: (token: string, payload: CoordinatesPayload) =>
    request<{ message?: string }>("/attendance/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }),
  checkOut: (token: string, payload: CoordinatesPayload) =>
    request<{ message?: string }>("/attendance/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }),
  submitAttendance: (token: string, payload: SubmitAttendancePayload) =>
    request<{ message?: string }>("/attendance/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }),
};
