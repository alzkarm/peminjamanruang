/**
 * SIPERU YARSI - Centralized API Service Layer
 * Fully connects Next.js frontend with NestJS Backend Engine
 */

import {
  Booking,
  Room,
  AcademicBlock,
  Feedback,
  UserSession,
  Role,
  BookingStatus,
  BookingCategory,
  BookingEquipment,
  BookingLogistikItem,
  ApprovalLogEntry,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_STORAGE_KEY = 'siperu_yarsi_auth_token';

// Token Management
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Universal Fetch Request Wrapper with Auth Interceptor
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
      let errorBody: any;
      try {
        errorBody = await res.json();
        if (errorBody && errorBody.message) {
          errorMessage = Array.isArray(errorBody.message)
            ? errorBody.message.join(', ')
            : errorBody.message;
        }
      } catch (e) {
        // Non-JSON error body
      }
      throw new ApiError(errorMessage, res.status, errorBody);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Gagal terhubung ke server backend SIPERU.',
      0
    );
  }
}

// -------------------------------------------------------------
// Data Normalizers (Transforms NestJS DB Models to Frontend UI Types)
// -------------------------------------------------------------

export function mapBackendStatusToFrontend(backendStatus: string): BookingStatus {
  switch (backendStatus) {
    case 'PENDING':
      return 'PENDING_LPF';
    case 'RECOMMENDED':
      return 'RECOMMENDED_YAYASAN';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    case 'RETURNED':
      return 'RETURNED';
    case 'CANCELED':
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return (backendStatus as BookingStatus) || 'PENDING_LPF';
  }
}

export function mapFrontendStatusToBackend(frontendStatus: string): string {
  switch (frontendStatus) {
    case 'PENDING_LPF':
      return 'PENDING';
    case 'RECOMMENDED_YAYASAN':
      return 'RECOMMENDED';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    case 'RETURNED':
      return 'RETURNED';
    case 'CANCELLED':
      return 'CANCELED';
    default:
      return frontendStatus;
  }
}

export function mapBackendBookingToFrontend(b: any): Booking {
  const startDate = b.startTime ? new Date(b.startTime) : new Date();
  const endDate = b.endTime ? new Date(b.endTime) : new Date();

  // Extract YYYY-MM-DD
  const dateStr = startDate.toISOString().slice(0, 10);
  // Extract HH:mm in Local/WIB
  const startHH = startDate.getHours().toString().padStart(2, '0');
  const startMM = startDate.getMinutes().toString().padStart(2, '0');
  const endHH = endDate.getHours().toString().padStart(2, '0');
  const endMM = endDate.getMinutes().toString().padStart(2, '0');

  // Parse additional facilities
  let equipments: BookingEquipment[] = [];
  try {
    if (b.additionalFacilities) {
      const parsed = typeof b.additionalFacilities === 'string' ? JSON.parse(b.additionalFacilities) : b.additionalFacilities;
      if (Array.isArray(parsed)) {
        equipments = parsed.map((item: any) =>
          typeof item === 'string'
            ? { equipmentId: item, equipmentName: item, quantity: 1 }
            : item
        );
      }
    }
  } catch (err) {
    // fallback
  }

  // Parse logistics items
  const logistik: BookingLogistikItem[] = Array.isArray(b.logistik)
    ? b.logistik.map((l: any) => ({
        id: l.id,
        jenisItem: l.jenisItem,
        jumlah: l.jumlah,
        catatan: l.catatan,
      }))
    : [];

  // Approval logs
  const approvalLogs = Array.isArray(b.approvalLogs)
    ? b.approvalLogs.map((log: any) => ({
        id: log.id,
        approverId: log.approverId,
        approverName: log.approver?.fullName || 'Petugas',
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        notes: log.notes,
        createdAt: log.createdAt,
      }))
    : [];

  const lpfLog = approvalLogs.find(
    (l: ApprovalLogEntry) => l.toStatus === 'RECOMMENDED' || (l.toStatus === 'APPROVED' && !b.room?.isSpecialRoom)
  );
  const yayasanLog = approvalLogs.find(
    (l: ApprovalLogEntry) => l.toStatus === 'APPROVED' && b.room?.isSpecialRoom
  );
  const rejectLog = approvalLogs.find(
    (l: ApprovalLogEntry) => l.toStatus === 'REJECTED' || l.toStatus === 'RETURNED'
  );

  const roomName = b.room?.name || 'Ruangan Kampus';
  const floorNumber = b.room?.floor?.level ?? 1;
  const buildingName = roomName.includes('Menara')
    ? 'Menara YARSI'
    : roomName.includes('FK')
    ? 'Gedung Fakultas Kedokteran'
    : 'Gedung C Kampus YARSI';

  const userRole: Role =
    b.user?.role === 'ADMIN_YAYASAN'
      ? 'admin_yayasan'
      : b.user?.role === 'ADMIN_UNIV'
      ? 'admin_lpf'
      : b.user?.username?.startsWith('03')
      ? 'dosen'
      : 'mahasiswa';

  return {
    id: b.id,
    bookingCode: `YARSI-BK-${b.id.slice(0, 8).toUpperCase()}`,
    roomId: b.roomId,
    roomName,
    building: buildingName,
    floor: floorNumber,
    userId: b.userId,
    userName: b.user?.fullName || 'Civitas YARSI',
    userEmail: b.user?.email || `${b.user?.username || 'user'}@yarsi.ac.id`,
    userNimNidn: b.user?.username || '',
    userRole,
    userPhone: '0812-9876-5432',
    userOrganization: b.user?.unitName || 'Universitas YARSI',
    department: b.user?.unitName || 'Civitas Academica',
    title: b.title,
    category: (b.activityType?.toLowerCase() as BookingCategory) || 'seminar',
    jenisKegiatan: b.activityType,
    description: b.notes || 'Permohonan peminjaman ruang kegiatan resmi.',
    estimatedAttendees: b.room?.capacity ? Math.round(b.room.capacity * 0.8) : 50,
    date: dateStr,
    startTime: `${startHH}:${startMM}`,
    endTime: `${endHH}:${endMM}`,
    status: mapBackendStatusToFrontend(b.status),
    requiresYayasanApproval: b.room?.isSpecialRoom ?? false,
    isLeaderApproved: b.isLeaderApproved ?? false,
    equipments,
    logistik,
    documentUrl: b.attachmentUrl || b.dokumenUrl,
    dokumenUrl: b.attachmentUrl || b.dokumenUrl,
    documentName: b.attachmentUrl ? b.attachmentUrl.split('/').pop() : undefined,
    lpfNotes: lpfLog?.notes,
    lpfApprovedAt: lpfLog?.createdAt,
    lpfApprovedBy: lpfLog?.approverName,
    yayasanNotes: yayasanLog?.notes,
    yayasanApprovedAt: yayasanLog?.createdAt,
    yayasanApprovedBy: yayasanLog?.approverName,
    rejectionReason: rejectLog?.notes,
    catatan: rejectLog?.notes || b.notes,
    approvalLogs,
    qrCodeToken: `QR-YARSI-BK-${b.id.slice(0, 6).toUpperCase()}-SEC`,
    createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString('id-ID') : '',
    feedbackSubmitted: !!b.feedback,
  };
}

export function mapBackendRoomToFrontend(r: any): Room {
  const floorLevel = r.floor?.level ?? 1;
  const isSpecial = r.isSpecialRoom ?? false;
  const isAuditorium = r.name.toLowerCase().includes('auditorium');
  const isLab = r.name.toLowerCase().includes('lab');
  const isMeeting = r.name.toLowerCase().includes('rapat') || r.name.toLowerCase().includes('senat');
  const isStudio = r.name.toLowerCase().includes('studio');

  let type: Room['type'] = 'classroom';
  if (isAuditorium) type = 'auditorium';
  else if (isLab) type = 'lab';
  else if (isMeeting) type = 'meeting';
  else if (isStudio) type = 'studio';

  const building = r.name.includes('Menara')
    ? 'Menara YARSI'
    : r.name.includes('FK')
    ? 'Gedung Fakultas Kedokteran'
    : 'Gedung C Kampus YARSI';

  const imageMap: Record<string, string> = {
    auditorium: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    classroom: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    lab: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
    meeting: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800',
    studio: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
    hall: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
  };

  return {
    id: r.id,
    code: `MY-${floorLevel > 0 ? floorLevel * 100 : 'B1'}-${r.id.slice(0, 2).toUpperCase()}`,
    name: r.name,
    building,
    floor: floorLevel,
    capacity: r.capacity,
    type,
    requiresYayasanApproval: isSpecial,
    facilities: [
      'AC Central',
      'Proyektor / Display HD',
      'Sound System',
      'Wi-Fi Eduroam YARSI',
      'Colokan Listrik Tiap Meja',
    ],
    imageUrl: imageMap[type] || imageMap.classroom,
    description: `Ruangan fasilitas resmi Kampus Universitas YARSI dengan kapasitas ${r.capacity} kursi, dilengkapi infrastruktur smart audio-visual.`,
    isActive: r.isActive ?? true,
    locationDetails: `${building}, Lantai ${floorLevel}`,
    picName: isSpecial ? 'Drs. H. M. Shadiq / LPF' : 'Tim Layanan Fasilitas Kampus',
    picPhone: '0812-9876-5432',
  };
}

// -------------------------------------------------------------
// API Service Modules
// -------------------------------------------------------------

export const authApi = {
  async login(username: string, password?: string): Promise<{
    message: string;
    accessToken: string;
    user: UserSession;
  }> {
    const data = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password: password || 'password123',
      }),
    });

    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }

    const roleMap: Record<string, Role> = {
      ADMIN_YAYASAN: 'admin_yayasan',
      ADMIN_UNIV: 'admin_lpf',
      USER: username.startsWith('03') ? 'dosen' : 'mahasiswa',
      GUEST: 'guest',
    };

    const user: UserSession = {
      id: data.user.id,
      name: data.user.fullName,
      identifier: data.user.username,
      role: roleMap[data.user.role] || 'mahasiswa',
      email: data.user.email || `${data.user.username}@yarsi.ac.id`,
      department: data.user.unitName,
      organization: data.user.unitName,
      phone: '0812-9876-5432',
      token: data.accessToken,
    };

    return {
      message: data.message,
      accessToken: data.accessToken,
      user,
    };
  },

  async getProfile(): Promise<UserSession> {
    const data = await request<any>('/auth/profile');
    const roleMap: Record<string, Role> = {
      ADMIN_YAYASAN: 'admin_yayasan',
      ADMIN_UNIV: 'admin_lpf',
      USER: data.username?.startsWith('03') ? 'dosen' : 'mahasiswa',
      GUEST: 'guest',
    };

    return {
      id: data.id,
      name: data.fullName,
      identifier: data.username,
      role: roleMap[data.role] || 'mahasiswa',
      email: data.email || `${data.username}@yarsi.ac.id`,
      department: data.unitName,
      organization: data.unitName,
      phone: '0812-9876-5432',
    };
  },
};

export const roomsApi = {
  async getAll(query?: { isSpecialRoom?: boolean }): Promise<Room[]> {
    const params = new URLSearchParams();
    if (query?.isSpecialRoom !== undefined) {
      params.append('isSpecialRoom', String(query.isSpecialRoom));
    }
    const endpoint = `/rooms${params.toString() ? `?${params.toString()}` : ''}`;
    const data = await request<any[]>(endpoint);
    return data.map(mapBackendRoomToFrontend);
  },

  async getFloors(): Promise<any[]> {
    return request<any[]>('/rooms/floors');
  },

  async checkAvailability(roomId: string, startTime: string, endTime: string): Promise<{
    available: boolean;
    conflicts: any[];
  }> {
    return request<any>(
      `/rooms/availability?roomId=${roomId}&startTime=${encodeURIComponent(
        startTime
      )}&endTime=${encodeURIComponent(endTime)}`
    );
  },

  async getById(id: string): Promise<Room> {
    const data = await request<any>(`/rooms/${id}`);
    return mapBackendRoomToFrontend(data);
  },
};

export const bookingsApi = {
  async getAll(query?: {
    status?: string;
    roomId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', mapFrontendStatusToBackend(query.status));
    if (query?.roomId) params.append('roomId', query.roomId);
    if (query?.userId) params.append('userId', query.userId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    const endpoint = `/bookings${params.toString() ? `?${params.toString()}` : ''}`;
    const data = await request<any[]>(endpoint);
    return data.map(mapBackendBookingToFrontend);
  },

  async getById(id: string): Promise<Booking> {
    const data = await request<any>(`/bookings/${id}`);
    return mapBackendBookingToFrontend(data);
  },

  async create(
    payload: {
      roomId: string;
      title: string;
      activityType: string;
      startTime: string; // ISO 8601 UTC string
      endTime: string; // ISO 8601 UTC string
      additionalFacilities?: string[];
      logistik?: BookingLogistikItem[];
      notes?: string;
      catatan?: string;
      dokumenUrl?: string;
      isLeaderApproved?: boolean;
    },
    fileAttachment?: File
  ): Promise<Booking> {
    if (fileAttachment) {
      const formData = new FormData();
      formData.append('roomId', payload.roomId);
      formData.append('title', payload.title);
      formData.append('activityType', payload.activityType);
      formData.append('startTime', payload.startTime);
      formData.append('endTime', payload.endTime);
      if (payload.notes) formData.append('notes', payload.notes);
      if (payload.isLeaderApproved !== undefined) {
        formData.append('isLeaderApproved', String(payload.isLeaderApproved));
      }
      if (payload.additionalFacilities) {
        payload.additionalFacilities.forEach((fac) =>
          formData.append('additionalFacilities[]', fac)
        );
      }
      formData.append('attachment', fileAttachment);

      const res = await request<any>('/bookings', {
        method: 'POST',
        body: formData,
      });
      return mapBackendBookingToFrontend(res);
    }

    const res = await request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapBackendBookingToFrontend(res);
  },

  async updateStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<Booking> {
    const backendStatus = mapFrontendStatusToBackend(status);
    const res = await request<any>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: backendStatus,
        notes: notes || undefined,
        catatan: notes || undefined,
      }),
    });
    return mapBackendBookingToFrontend(res);
  },

  async cancel(id: string, reason?: string): Promise<Booking> {
    const res = await request<any>(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: reason || 'Dibatalkan oleh pemohon',
        catatan: reason || 'Dibatalkan oleh pemohon',
      }),
    });
    return mapBackendBookingToFrontend(res);
  },
};

export const academicBulkApi = {
  async getAll(): Promise<AcademicBlock[]> {
    const data = await request<any[]>('/academic-bulk');
    return data.map((b: any) => ({
      id: b.id,
      title: b.title,
      courseCode: b.courseCode || 'MK-YARSI',
      lecturerName: b.user?.fullName || 'Dosen Pengampu',
      roomId: b.roomId,
      roomName: b.room?.name || 'Ruang Kuliah',
      building: b.room?.name?.includes('Menara')
        ? 'Menara YARSI'
        : 'Gedung C Kampus YARSI',
      dayOfWeek: new Date(b.startTime).getDay() || 1,
      startTime: new Date(b.startTime).toISOString().slice(11, 16),
      endTime: new Date(b.endTime).toISOString().slice(11, 16),
      semester: 'Semester Ganjil 2026/2027',
      faculty: 'Fakultas Teknologi Informasi',
      studentGroup: 'Reguler A',
      isActive: true,
    }));
  },

  async create(dto: {
    roomId: string;
    title: string;
    courseCode: string;
    semester: string;
    faculty: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
  }): Promise<any> {
    return request<any>('/academic-bulk', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async delete(id: string): Promise<any> {
    return request<any>(`/academic-bulk/${id}`, {
      method: 'DELETE',
    });
  },
};

export const feedbacksApi = {
  async create(payload: {
    bookingId: string;
    cleanlinessRating: number;
    facilityRating: number;
    staffRating: number;
    comments?: string;
    reportedIssues?: string;
  }): Promise<Feedback> {
    const res = await request<any>('/feedbacks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: res.id,
      bookingId: res.bookingId,
      bookingCode: `YARSI-BK-${res.bookingId.slice(0, 8).toUpperCase()}`,
      roomId: res.booking?.roomId || '',
      roomName: res.booking?.room?.name || 'Ruang Kegiatan',
      userId: res.userId,
      userName: res.user?.fullName || 'Pengguna',
      cleanlinessRating: res.cleanlinessRating,
      facilityRating: res.facilityRating,
      staffPunctualityRating: res.staffRating,
      overallRating: res.overallRating,
      notes: res.comments || '',
      reportedIssue: res.reportedIssues,
      createdAt: res.createdAt,
    };
  },
};

export const reportsApi = {
  async getSummary(): Promise<any> {
    return request<any>('/reports/summary');
  },

  getExcelExportUrl(filter?: { startDate?: string; endDate?: string }): string {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (token) params.append('token', token);
    return `${API_BASE_URL}/reports/export/excel?${params.toString()}`;
  },
};
