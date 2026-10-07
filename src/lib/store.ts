import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Room,
  Booking,
  AcademicBlock,
  Feedback,
  UserSession,
  Role,
  BookingStatus,
  BookingLogistikItem,
} from './types';
import {
  authApi,
  roomsApi,
  bookingsApi,
  academicBulkApi,
  feedbacksApi,
  mapFrontendCategoryToBackendActivityType,
  removeAuthToken,
  setAuthToken,
} from './api';
import { getJakartaDateTimeIso, isRecurringBooking } from './utils';
import {
  DEMO_USERS,
  INITIAL_ROOMS,
  INITIAL_BOOKINGS,
  INITIAL_ACADEMIC_BLOCKS,
  INITIAL_FEEDBACKS,
} from './mockData';

// Default Guest User for unauthenticated state
export const GUEST_USER: UserSession = {
  id: 'guest',
  name: 'Tamu / Pengunjung',
  identifier: 'GUEST',
  role: 'guest',
  email: 'guest@yarsi.ac.id',
  department: 'Civitas Academica',
  organization: 'Pengunjung Umum',
  phone: '-',
};

interface AppState {
  currentUser: UserSession;
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  feedbacks: Feedback[];
  hasHydrated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Sync actions
  fetchInitialData: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchRooms: () => Promise<void>;
  fetchAcademicBlocks: () => Promise<void>;

  // Auth actions
  setCurrentUser: (user: UserSession) => void;
  login: (username: string, password?: string, roleCategory?: Role) => Promise<UserSession>;
  logout: () => void;

  // Booking actions
  addBooking: (
    newBooking: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'qrCodeToken' | 'status'
    >,
    fileAttachment?: File
  ) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<void>;
  approveBookingLPF: (
    bookingId: string,
    notes?: string,
    approverName?: string,
    applyToRecurringGroup?: boolean
  ) => Promise<void>;
  approveBookingYayasan: (
    bookingId: string,
    notes?: string,
    approverName?: string,
    applyToRecurringGroup?: boolean
  ) => Promise<void>;
  rejectBooking: (
    bookingId: string,
    reason: string,
    rejectedBy?: string,
    applyToRecurringGroup?: boolean
  ) => Promise<void>;
  returnBooking: (
    bookingId: string,
    notes: string,
    returnedBy?: string,
    applyToRecurringGroup?: boolean
  ) => Promise<void>;

  // Academic bulk blocker actions
  addAcademicBlock: (block: Omit<AcademicBlock, 'id'>) => Promise<AcademicBlock>;
  bulkAddAcademicBlocks: (blocks: Omit<AcademicBlock, 'id'>[]) => Promise<void>;
  deleteAcademicBlock: (id: string) => Promise<void>;
  toggleAcademicBlock: (id: string) => void;

  // Feedback actions
  addFeedback: (
    feedback: Omit<Feedback, 'id' | 'createdAt'>
  ) => Promise<Feedback>;

  // Clear errors
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: GUEST_USER,
      rooms: INITIAL_ROOMS,
      bookings: INITIAL_BOOKINGS,
      academicBlocks: INITIAL_ACADEMIC_BLOCKS,
      feedbacks: INITIAL_FEEDBACKS,
      hasHydrated: false,
      isLoading: false,
      isSyncing: false,
      error: null,

      clearError: () => set({ error: null }),

      fetchInitialData: async () => {
        set({ isSyncing: true, error: null });
        try {
          const [roomsData, bookingsData, academicData] = await Promise.allSettled([
            roomsApi.getAll(),
            bookingsApi.getAll(),
            academicBulkApi.getAll(),
          ]);

          set({
            rooms:
              roomsData.status === 'fulfilled' && roomsData.value?.length
                ? roomsData.value
                : (get().rooms?.length ? get().rooms : []),
            bookings:
              bookingsData.status === 'fulfilled'
                ? bookingsData.value
                : (get().bookings?.length ? get().bookings : []),
            academicBlocks:
              academicData.status === 'fulfilled'
                ? academicData.value
                : (get().academicBlocks?.length ? get().academicBlocks : []),
            isSyncing: false,
          });
        } catch (err: any) {
          set({ isSyncing: false, error: err.message });
        }
      },

      fetchRooms: async () => {
        try {
          const rooms = await roomsApi.getAll();
          set({ rooms });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchBookings: async () => {
        try {
          const { currentUser } = get();
          const bookings =
            currentUser?.role === 'user' && currentUser?.id && currentUser.id !== 'guest'
              ? await bookingsApi.getAll({ userId: currentUser.id })
              : await bookingsApi.getAll();
          set({ bookings });
        } catch (err: any) {
          // Guest / tanpa token: GET /bookings wajib login (401). Jangan
          // menimpa error global — kalender publik pakai endpoint
          // /rooms/schedule yang memang terbuka untuk guest.
          const status = err?.statusCode ?? err?.status;
          if (status === 401 || status === 403) return;
          set({ error: err.message });
        }
      },

      fetchAcademicBlocks: async () => {
        try {
          const academicBlocks = await academicBulkApi.getAll();
          set({ academicBlocks });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      setCurrentUser: (user) => {
        if (user.token) setAuthToken(user.token);
        set({ currentUser: user });
      },

      login: async (username, password, roleCategory) => {
        set({ isLoading: true, error: null });

        // Check local demo account first if matching
        const cleanUser = username.trim().toLowerCase();
        const demoUser = DEMO_USERS.find(
          (u) =>
            u.identifier.toLowerCase() === cleanUser ||
            u.id.toLowerCase() === cleanUser ||
            u.email.toLowerCase() === cleanUser ||
            (roleCategory && u.role === roleCategory)
        );

        try {
          const res = await authApi.login(username, password);
          set({ currentUser: res.user, isLoading: false });
          // Fetch updated bookings after login
          get().fetchBookings();
          return res.user;
        } catch (err: any) {
          // If backend API/LDAP is unavailable or returned error, fallback to local demo account
          if (demoUser) {
            set({ currentUser: demoUser, isLoading: false });
            return demoUser;
          }

          const errorMessage =
            err?.message ||
            'Gagal terhubung ke server autentikasi LDAP YARSI. Pastikan Anda terhubung ke jaringan kampus.';
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        removeAuthToken();
        set({
          currentUser: GUEST_USER,
        });
      },

      addBooking: async (bookingData, fileAttachment) => {
        set({ isLoading: true, error: null });
        try {
          const startIso = getJakartaDateTimeIso(bookingData.date, bookingData.startTime);
          const endIso = getJakartaDateTimeIso(bookingData.date, bookingData.endTime);

          // Prepare facilities and logistics
          const additionalFacilities = bookingData.equipments?.map((e) => e.equipmentName) || [];
          const logistik: BookingLogistikItem[] =
            bookingData.logistik ||
            bookingData.equipments?.map((e) => ({
              jenisItem: e.equipmentName,
              jumlah: e.quantity || 1,
              catatan: e.notes,
            })) || [];

          const created = await bookingsApi.create(
            {
              roomId: bookingData.roomId,
              title: bookingData.title,
              activityType: mapFrontendCategoryToBackendActivityType(bookingData.category),
              startTime: startIso,
              endTime: endIso,
              dates: bookingData.dates,
              additionalFacilities,
              logistik,
              notes: bookingData.description,
              catatan: bookingData.description,
              isLeaderApproved: bookingData.isLeaderApproved ?? true,
            },
            fileAttachment
          );

          set((state) => ({
            bookings: [created, ...state.bookings.filter((b) => b.id !== created.id)],
            isLoading: false,
          }));

          return created;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err?.message || 'Gagal mengajukan permohonan peminjaman ruangan.',
          });
          throw err;
        }
      },

      cancelBooking: async (bookingId, reason, applyToRecurringGroup = true) => {
        set({ isSyncing: true });
        const booking = get().bookings.find((b) => b.id === bookingId);
        let relatedIds = [bookingId];
        if (applyToRecurringGroup && booking) {
          if (booking.bulkGroupId) {
            relatedIds = get().bookings
              .filter((b) => b.bulkGroupId === booking.bulkGroupId && b.status === booking.status)
              .map((b) => b.id);
          } else if (isRecurringBooking(booking)) {
            relatedIds = get().bookings
              .filter(
                (b) =>
                  b.userId === booking.userId &&
                  b.roomId === booking.roomId &&
                  b.title === booking.title &&
                  b.status === booking.status &&
                  isRecurringBooking(b)
              )
              .map((b) => b.id);
          }
        }
        if (relatedIds.length === 0) relatedIds = [bookingId];

        try {
          if (relatedIds.length > 1) {
            await bookingsApi.updateBatchStatus(relatedIds, 'CANCELLED', reason);
          } else {
            await bookingsApi.cancel(bookingId, reason);
          }

          set((state) => ({
            bookings: state.bookings.map((b) =>
              relatedIds.includes(b.id)
                ? { ...b, status: 'CANCELLED' as BookingStatus, rejectionReason: reason }
                : b
            ),
            isSyncing: false,
          }));
        } catch (err: unknown) {
          set({
            isSyncing: false,
            error:
              err instanceof Error
                ? err.message
                : 'Gagal membatalkan pengajuan peminjaman.',
          });
          throw err;
        }

      },

      approveBookingLPF: async (bookingId, notes, approverName, applyToRecurringGroup = true) => {
        set({ isSyncing: true });
        const booking = get().bookings.find((b) => b.id === bookingId);
        // Dua tahap: admin verifikasi (VERIFIED), superadmin approval final (APPROVED).
        const isSuper = get().currentUser?.role === 'superadmin';
        const targetStatus = isSuper ? 'APPROVED' : 'VERIFIED';
        const frontendTargetStatus: BookingStatus = targetStatus;

        let relatedIds = [bookingId];
        if (applyToRecurringGroup && booking) {
          const matchStatus = booking.status;
          if (booking.bulkGroupId) {
            relatedIds = get().bookings
              .filter((b) => b.bulkGroupId === booking.bulkGroupId && b.status === matchStatus)
              .map((b) => b.id);
          } else if (isRecurringBooking(booking)) {
            relatedIds = get().bookings
              .filter(
                (b) =>
                  b.userId === booking.userId &&
                  b.roomId === booking.roomId &&
                  b.title === booking.title &&
                  b.status === matchStatus &&
                  isRecurringBooking(b)
              )
              .map((b) => b.id);
          }
        }
        if (relatedIds.length === 0) relatedIds = [bookingId];

        try {
          if (relatedIds.length > 1) {
            await bookingsApi.updateBatchStatus(relatedIds, targetStatus, notes);
          } else {
            await bookingsApi.updateStatus(bookingId, targetStatus, notes, applyToRecurringGroup);
          }

          const now = new Date().toLocaleString('id-ID');
          const approver = approverName || 'Admin SIPERU';
          set((state) => ({
            bookings: state.bookings.map((b) =>
              relatedIds.includes(b.id)
                ? {
                    ...b,
                    status: frontendTargetStatus as BookingStatus,
                    lpfNotes: notes || (isSuper ? 'Disetujui oleh Superadmin' : 'Diverifikasi oleh Admin'),
                    lpfApprovedAt: now,
                    lpfApprovedBy: approver,
                  }
                : b
            ),
            isSyncing: false,
          }));
        } catch (err: unknown) {
          set({
            isSyncing: false,
            error: err instanceof Error ? err.message : 'Gagal memproses persetujuan LPF.',
          });
          throw err;
        }

      },

      approveBookingYayasan: async (bookingId, notes, approverName, applyToRecurringGroup = true) => {
        // Alias kompatibilitas lama: tahap final superadmin — semua lewat approveBookingLPF.
        return get().approveBookingLPF(bookingId, notes, approverName, applyToRecurringGroup);
      },

      rejectBooking: async (bookingId, reason, rejectedBy, applyToRecurringGroup = true) => {
        set({ isSyncing: true });
        const booking = get().bookings.find((b) => b.id === bookingId);

        let relatedIds = [bookingId];
        if (applyToRecurringGroup && booking) {
          if (booking.bulkGroupId) {
            relatedIds = get().bookings
              .filter((b) => b.bulkGroupId === booking.bulkGroupId && b.status === booking.status)
              .map((b) => b.id);
          } else if (isRecurringBooking(booking)) {
            relatedIds = get().bookings
              .filter(
                (b) =>
                  b.userId === booking.userId &&
                  b.roomId === booking.roomId &&
                  b.title === booking.title &&
                  b.status === booking.status &&
                  isRecurringBooking(b)
              )
              .map((b) => b.id);
          }
        }
        if (relatedIds.length === 0) relatedIds = [bookingId];

        try {
          if (relatedIds.length > 1) {
            await bookingsApi.updateBatchStatus(relatedIds, 'REJECTED', reason);
          } else {
            await bookingsApi.updateStatus(bookingId, 'REJECTED', reason, applyToRecurringGroup);
          }

          set((state) => ({
            bookings: state.bookings.map((b) =>
              relatedIds.includes(b.id)
                ? {
                    ...b,
                    status: 'REJECTED' as BookingStatus,
                    rejectionReason: reason,
                    lpfNotes: `Ditolak oleh ${rejectedBy || 'Admin'}: ${reason}`,
                  }
                : b
            ),
            isSyncing: false,
          }));
        } catch (err: unknown) {
          set({
            isSyncing: false,
            error: err instanceof Error ? err.message : 'Gagal memproses penolakan pengajuan.',
          });
          throw err;
        }

      },

      returnBooking: async (bookingId, notes, returnedBy, applyToRecurringGroup = true) => {
        set({ isSyncing: true });
        const booking = get().bookings.find((b) => b.id === bookingId);

        let relatedIds = [bookingId];
        if (applyToRecurringGroup && booking) {
          if (booking.bulkGroupId) {
            relatedIds = get().bookings
              .filter((b) => b.bulkGroupId === booking.bulkGroupId && b.status === booking.status)
              .map((b) => b.id);
          } else if (isRecurringBooking(booking)) {
            relatedIds = get().bookings
              .filter(
                (b) =>
                  b.userId === booking.userId &&
                  b.roomId === booking.roomId &&
                  b.title === booking.title &&
                  b.status === booking.status &&
                  isRecurringBooking(b)
              )
              .map((b) => b.id);
          }
        }
        if (relatedIds.length === 0) relatedIds = [bookingId];

        try {
          if (relatedIds.length > 1) {
            await bookingsApi.updateBatchStatus(relatedIds, 'RETURNED', notes);
          } else {
            await bookingsApi.updateStatus(bookingId, 'RETURNED', notes, applyToRecurringGroup);
          }

          set((state) => ({
            bookings: state.bookings.map((b) =>
              relatedIds.includes(b.id)
                ? {
                    ...b,
                    status: 'RETURNED' as BookingStatus,
                    rejectionReason: notes,
                    lpfNotes: `Dikembalikan oleh ${returnedBy || 'Admin'}: ${notes}`,
                  }
                : b
            ),
            isSyncing: false,
          }));
        } catch (err: unknown) {
          set({
            isSyncing: false,
            error: err instanceof Error ? err.message : 'Gagal memproses pengembalian pengajuan.',
          });
          throw err;
        }

      },

      addAcademicBlock: async (blockData) => {
        set({ isLoading: true });
        try {
          const res = await academicBulkApi.create({
            courseName: blockData.title,
            lecturerName: blockData.lecturerName,
            roomIds: [blockData.roomId],
            dayOfWeek: blockData.dayOfWeek,
            startTimeStr: blockData.startTime,
            endTimeStr: blockData.endTime,
            semesterStartDate: '2026-09-01',
            semesterEndDate: '2027-01-15',
            faculty: blockData.faculty,
            studentGroup: blockData.studentGroup,
          });
          const newBlock: AcademicBlock = {
            ...blockData,
            id: res?.bulkGroupId || `acad-${Date.now()}`,
          };
          set((state) => ({
            academicBlocks: [newBlock, ...state.academicBlocks],
            isLoading: false,
          }));
          return newBlock;
        } catch (err: unknown) {
          set({
            isLoading: false,
            error:
              err instanceof Error
                ? err.message
                : 'Gagal menambahkan blok jadwal perkuliahan.',
          });
          throw err;
        }
      },

      bulkAddAcademicBlocks: async (blocks) => {
        set({ isLoading: true });
        try {
          const createdBlocks: AcademicBlock[] = [];
          for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            try {
              const res = await academicBulkApi.create({
                courseName: b.title,
                lecturerName: b.lecturerName,
                roomIds: [b.roomId],
                dayOfWeek: b.dayOfWeek,
                startTimeStr: b.startTime,
                endTimeStr: b.endTime,
                semesterStartDate: '2026-09-01',
                semesterEndDate: '2027-01-15',
                faculty: b.faculty,
                studentGroup: b.studentGroup,
              });
              createdBlocks.push({
                ...b,
                id: res?.bulkGroupId || `acad-bulk-${Date.now()}-${i}`,
              });
            } catch (innerErr) {
              createdBlocks.push({
                ...b,
                id: `acad-bulk-${Date.now()}-${i}`,
              });
            }
          }
          set((state) => ({
            academicBlocks: [...createdBlocks, ...state.academicBlocks],
            isLoading: false,
          }));
        } catch (err) {
          const fallbackBlocks: AcademicBlock[] = blocks.map((b, i) => ({
            ...b,
            id: `acad-bulk-${Date.now()}-${i}`,
          }));
          set((state) => ({
            academicBlocks: [...fallbackBlocks, ...state.academicBlocks],
            isLoading: false,
          }));
        }
      },

      deleteAcademicBlock: async (id) => {
        try {
          await academicBulkApi.delete(id);
        } catch (err) {
          // ignore
        }
        set((state) => ({
          academicBlocks: state.academicBlocks.filter((b) => b.id !== id),
        }));
      },

      toggleAcademicBlock: (id) => {
        set((state) => ({
          academicBlocks: state.academicBlocks.map((b) =>
            b.id === id ? { ...b, isActive: !b.isActive } : b
          ),
        }));
      },

      addFeedback: async (feedbackData) => {
        set({ isLoading: true });
        try {
          const feedback = await feedbacksApi.create({
            bookingId: feedbackData.bookingId,
            cleanlinessRating: feedbackData.cleanlinessRating,
            facilityRating: feedbackData.facilityRating,
            staffRating: feedbackData.staffPunctualityRating,
            comments: feedbackData.notes,
            reportedIssues: feedbackData.reportedIssue,
          });

          set((state) => ({
            feedbacks: [feedback, ...state.feedbacks],
            bookings: state.bookings.map((b) =>
              b.id === feedbackData.bookingId
                ? { ...b, feedbackSubmitted: true, status: 'COMPLETED' as BookingStatus }
                : b
            ),
            isLoading: false,
          }));

          return feedback;
        } catch (err: any) {
          const newFeedback: Feedback = {
            ...feedbackData,
            id: `fb-${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          set((state) => ({
            feedbacks: [newFeedback, ...state.feedbacks],
            bookings: state.bookings.map((b) =>
              b.id === feedbackData.bookingId
                ? { ...b, feedbackSubmitted: true, status: 'COMPLETED' as BookingStatus }
                : b
            ),
            isLoading: false,
          }));
          return newFeedback;
        }
      },
    }),
    {
      name: 'siperu_yarsi_app_storage_v4',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          // Trigger background fetch directly from DB
          state.fetchInitialData();
        }
      },
    }
  )
);
