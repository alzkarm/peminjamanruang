export type Role = 'mahasiswa' | 'dosen' | 'tendik' | 'admin_lpf' | 'admin_yayasan';

export type RoomType = 'auditorium' | 'classroom' | 'lab' | 'meeting' | 'studio' | 'hall';

export type BookingStatus =
  | 'PENDING_LPF'
  | 'RECOMMENDED_YAYASAN'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ACADEMIC_BLOCKED'
  | 'COMPLETED';

export type BookingCategory =
  | 'kuliah'
  | 'seminar'
  | 'rapat'
  | 'ujian'
  | 'workshop'
  | 'yayasan'
  | 'kemahasiswaan'
  | 'lainnya';

export interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
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
  description: string;
  estimatedAttendees: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: BookingStatus;
  requiresYayasanApproval: boolean;
  equipments: BookingEquipment[];
  documentUrl?: string;
  documentName?: string;
  lpfNotes?: string;
  lpfApprovedAt?: string;
  lpfApprovedBy?: string;
  yayasanNotes?: string;
  yayasanApprovedAt?: string;
  yayasanApprovedBy?: string;
  rejectionReason?: string;
  qrCodeToken: string;
  createdAt: string;
  feedbackSubmitted?: boolean;
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
  identifier: string; // NIM / NIDN / NIK
  role: Role;
  email: string;
  department: string;
  organization?: string;
  phone: string;
  avatarUrl?: string;
}
