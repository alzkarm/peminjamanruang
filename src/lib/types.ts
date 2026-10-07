export type Role = 'user' | 'admin' | 'superadmin' | 'guest';

// Migrasi role: backend internal UPPERCASE, response API lowercase; legacy admin_umum/admin_lpf/admin_yayasan -> admin, mahasiswa/dosen/tendik -> user.
export function isAdminRole(r: Role | string | undefined | null): r is 'admin' | 'superadmin' {
  return r === 'admin' || r === 'superadmin';
}

export type RoomType = 'auditorium' | 'classroom' | 'lab' | 'meeting' | 'studio' | 'hall';

export type BookingStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'RECOMMENDED'
  | 'PENDING_LPF'
  | 'RECOMMENDED_YAYASAN'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'ACADEMIC_BLOCKED'
  | 'EXPIRED'
  | 'RESCHEDULE_PENDING'
  | 'NO_SHOW'
  | 'COMPLETED';

export interface Faculty {
  id: string;
  code: string;
  name: string;
  colorBg?: string;
  colorBorder?: string;
  colorText?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Facility {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  isSpecial?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export type BookingCategory =
  | 'seminar'
  | 'workshop'
  | 'pelatihan'
  | 'rapat'
  | 'kunjungan'
  | 'kuliah_tamu'
  | 'kuliah'
  | 'ujian'
  | 'akreditasi'
  | 'ormawa'
  | 'yayasan'
  | 'lainnya';

export interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  floorName?: string;
  capacity: number | null;
  type: RoomType;
  requiresYayasanApproval: boolean;
  facilities: string[];
  imageUrl: string;
  description: string;
  isActive: boolean;
  locationDetails: string;
  picName?: string;
  picPhone?: string;
}

export interface RoomAvailabilityResponse {
  isAvailable: boolean;
  conflicts: Array<{
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

export interface PublicScheduleEvent {
  id: string;
  roomId: string;
  roomName: string;
  floorName: string;
  title?: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: 'audio_visual' | 'furniture' | 'hvac' | 'connectivity' | 'service';
  icon: string;
  isSpecialRequest: boolean;
}

export interface BookingEquipment {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  notes?: string;
}

export interface BookingLogistikItem {
  id?: string;
  jenisItem: string;
  jumlah: number;
  catatan?: string;
}

export interface RoomReadinessChecklist {
  id?: string;
  bookingId: string;
  isAcReady: boolean;
  isAudioReady: boolean;
  isLogisticsReady: boolean;
  isCleanlinessReady: boolean;
  checkedBy?: string;
  notes?: string;
  updatedAt?: string;
}

export interface ApprovalLogEntry {
  id: string;
  approverId: string;
  approverName?: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  roomId: string;
  roomName: string;
  building: string;
  floor: number;
  userId: string;
  userName: string;
  userEmail: string;
  userNimNidn: string;
  userRole: Role;
  userPhone: string;
  userOrganization: string;
  department: string;
  title: string;
  category: BookingCategory;
  jenisKegiatan?: string;
  description: string;
  estimatedAttendees: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: BookingStatus;
  requiresYayasanApproval: boolean;
  isLeaderApproved?: boolean;
  isPerSemester?: boolean;
  semester?: string;
  tenggatPelaksanaan?: string;
  dates?: string[];
  bulkGroupId?: string;
  equipments: BookingEquipment[];
  logistik?: BookingLogistikItem[];
  documentUrl?: string;
  dokumenUrl?: string;
  documentName?: string;
  lpfNotes?: string;
  lpfApprovedAt?: string;
  lpfApprovedBy?: string;
  yayasanNotes?: string;
  yayasanApprovedAt?: string;
  yayasanApprovedBy?: string;
  rejectionReason?: string;
  notes?: string;
  catatan?: string;
  approvalLogs?: ApprovalLogEntry[];
  qrCodeToken: string;
  passToken?: string;
  readinessChecklist?: RoomReadinessChecklist;
  additionalFacilities?: string[];
  createdAt: string;
  feedbackSubmitted?: boolean;
  rescheduleReason?: string;
  originalSchedule?: string;
}

export interface Feedback {
  id: string;
  bookingId: string;
  bookingCode: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  cleanlinessRating: number; // 1-5
  facilityRating: number; // 1-5
  staffPunctualityRating: number; // 1-5
  overallRating: number;
  notes: string;
  reportedIssue?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface AcademicBlock {
  id: string;
  title: string;
  courseCode: string;
  lecturerName: string;
  roomId: string;
  roomName: string;
  building: string;
  dayOfWeek: number; // 1 = Senin, 2 = Selasa, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  semester: string; // e.g. "Semester Ganjil 2026/2027"
  faculty: string;
  studentGroup: string;
  isActive: boolean;
}

export interface UserSession {
  id: string;
  name: string;
  identifier: string; // NIM / NIDN / NIK / username
  role: Role;
  email: string;
  department: string;
  organization?: string;
  phone: string;
  avatarUrl?: string;
  token?: string;
}

export type CbtFaculty = 'FEB' | 'FH' | 'FTI' | 'FK' | 'FKG' | 'FP';

export type CbtBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CbtRoomId = 'cbt-a' | 'cbt-b';
export type CbtRoomCode = 'A' | 'B';

export function getCbtRoomCode(roomId: CbtRoomId): CbtRoomCode {
  return roomId === 'cbt-b' ? 'B' : 'A';
}

export function isCbtRoomId(value: string | null): value is CbtRoomId {
  return value === 'cbt-a' || value === 'cbt-b';
}

export interface CbtSeatBooking {
  id: string;
  roomId?: CbtRoomCode;
  userId: string;
  faculty: CbtFaculty;
  title: string;
  seatStart: number;
  seatEnd: number;
  startTime: string;
  endTime: string;
  status?: CbtBookingStatus;
  notes?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    unitName: string;
  };
}

export interface RecentSubmission {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  roomCode: string;
  floorLevel: number;
  floorName: string;
  capacity: number;
  status: string;
  startTime: string;
  endTime: string;
  activityType: string;
  applicantName: string;
  unitName: string;
  createdAt: string;
}

export interface RoomMaintenance {
  id: string;
  roomId: string;
  roomName?: string;
  building?: string;
  floor?: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  createdAt?: string;
}

export interface UserPenalty {
  id: string;
  userId: string;
  reason: string;
  bookingId?: string;
  penaltyPoints: number;
  coolingDownUntil: string;
  isActive: boolean;
  createdAt: string;
}

