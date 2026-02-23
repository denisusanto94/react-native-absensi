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
  permissions?: string[] | string | null;
  permission?: string[] | string | null;
};

export type LoginResponse = LoginUserPayload & {
  token?: string | null;
  access_token?: string | null;
  user?: LoginUserPayload | null;
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

export type LeaveRecord = {
  id: number;
  user_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_by: number | null;
  created_at: string;
  user_name?: string | null;
  approved_by_name?: string | null;
  user_role?: string | null;
  user_roles?: string | null;
  role?: string | null;
};

export type LeaveRequestPayload = {
  user_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export type AttendancePhotoResponse = {
  message?: string;
  filename?: string;
  attendance_id?: number;
};

const authHeaders = (token?: string) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

const getFileExtension = (uri: string) => {
  const cleanUri = uri.split("?")[0];
  const match = cleanUri.match(/\.([a-z0-9]+)$/i);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }
  return "jpg";
};

const resolveMimeType = (extension: string) => {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
};

const buildPhotoFormData = (uri: string) => {
  const extension = getFileExtension(uri);
  const formData = new FormData();
  formData.append(
    "foto",
    {
      uri,
      name: `selfie_${Date.now()}.${extension}`,
      type: resolveMimeType(extension),
    } as any
  );
  return formData;
};

export const api = {
  loginUser: (email: string, password: string) =>
    request<LoginResponse>("/auth/login_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
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
  getLeaves: (token: string) =>
    request<LeaveRecord[]>("/leaves", {
      method: "GET",
      headers: {
        ...(authHeaders(token) ?? {}),
      },
    }),
  createLeave: (token: string, payload: LeaveRequestPayload) =>
    request<{ message?: string }>("/leaves", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }),
  updateLeaveStatus: (token: string, leaveId: number, status: "approved" | "rejected") =>
    request<{ message?: string }>(`/leaves/${leaveId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeaders(token) ?? {}),
      },
      body: JSON.stringify({ status }),
    }),
  deleteLeave: (token: string, leaveId: number) =>
    request<{ message?: string }>(`/leaves/${leaveId}`, {
      method: "DELETE",
      headers: {
        ...(authHeaders(token) ?? {}),
      },
    }),
  uploadAttendancePhotoCheckIn: (token: string, uri: string) =>
    request<AttendancePhotoResponse>("/attendance-foto/checkin", {
      method: "POST",
      headers: {
        ...(authHeaders(token) ?? {}),
      },
      body: buildPhotoFormData(uri),
    }),
  uploadAttendancePhotoCheckOut: (token: string, uri: string) =>
    request<AttendancePhotoResponse>("/attendance-foto/checkout", {
      method: "POST",
      headers: {
        ...(authHeaders(token) ?? {}),
      },
      body: buildPhotoFormData(uri),
    }),
};
