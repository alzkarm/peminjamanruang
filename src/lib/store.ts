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
  removeAuthToken,
  setAuthToken,
} from './api';

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
    approverName?: string
  ) => Promise<void>;
  approveBookingYayasan: (
    bookingId: string,
    notes?: string,
    approverName?: string
  ) => Promise<void>;
  rejectBooking: (
    bookingId: string,
    reason: string,
    rejectedBy?: string
  ) => Promise<void>;
  returnBooking: (
    bookingId: string,
    notes: string,
    returnedBy?: string
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
      rooms: [],
      bookings: [],
      academicBlocks: [],
      feedbacks: [],
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
            rooms: roomsData.status === 'fulfilled' ? roomsData.value : get().rooms,
            bookings: bookingsData.status === 'fulfilled' ? bookingsData.value : get().bookings,
            academicBlocks:
              academicData.status === 'fulfilled'
                ? academicData.value
                : get().academicBlocks,
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
          const bookings = await bookingsApi.getAll();
          set({ bookings });
        } catch (err: any) {
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
        try {
          const res = await authApi.login(username, password);
          set({ currentUser: res.user, isLoading: false });
          // Fetch updated bookings after login
          get().fetchBookings();
          return res.user;
        } catch (err: any) {
          // No offline fallback — LDAP is the only authentication path
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
          // Parse start and end time into ISO format
          const startIso = new Date(`${bookingData.date}T${bookingData.startTime}:00Z`).toISOString();
          const endIso = new Date(`${bookingData.date}T${bookingData.endTime}:00Z`).toISOString();

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
              activityType: (bookingData.category || 'SEMINAR').toUpperCase(),
              startTime: startIso,
              endTime: endIso,
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
          set({ isLoading: false, error: err.message });
          // If offline / mock fallback
          const newId = `bk-${Date.now()}`;
          const newBooking: Booking = {
            ...bookingData,
            id: newId,
            bookingCode: `YARSI-BK-${newId.slice(-6).toUpperCase()}`,
            status: 'PENDING_LPF',
            createdAt: new Date().toLocaleString('id-ID'),
            qrCodeToken: `QR-YARSI-${newId.slice(-6).toUpperCase()}-SEC`,
            feedbackSubmitted: false,
          };
          set((state) => ({
            bookings: [newBooking, ...state.bookings],
          }));
          return newBooking;
        }
      },

      cancelBooking: async (bookingId, reason) => {
        set({ isSyncing: true });
        try {
          const updated = await bookingsApi.cancel(bookingId, reason);
          set((state) => ({
            bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
            isSyncing: false,
          }));
        } catch (err: any) {
          // Client-side fallback
          set((state) => ({
            bookings: state.bookings.map((b) =>
              b.id === bookingId ? { ...b, status: 'CANCELLED' as BookingStatus } : b
            ),
            isSyncing: false,
          }));
        }
      },

      approveBookingLPF: async (bookingId, notes, approverName) => {
        set({ isSyncing: true });
        try {
          const booking = get().bookings.find((b) => b.id === bookingId);
          const targetStatus = booking?.requiresYayasanApproval
            ? 'RECOMMENDED'
            : 'APPROVED';

          const updated = await bookingsApi.updateStatus(bookingId, targetStatus, notes);
          set((state) => ({
            bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
            isSyncing: false,
          }));
        } catch (err: any) {
          // Client-side optimistic update fallback
          const now = new Date().toLocaleString('id-ID');
          const approver = approverName || 'Bambang Sudibyo (LPF)';
          set((state) => ({
            bookings: state.bookings.map((b) => {
              if (b.id === bookingId) {
                if (b.requiresYayasanApproval) {
                  return {
                    ...b,
                    status: 'RECOMMENDED_YAYASAN' as BookingStatus,
                    lpfNotes: notes || 'Diverifikasi LPF & Direkomendasikan ke Yayasan',
                    lpfApprovedAt: now,
                    lpfApprovedBy: approver,
                  };
                } else {
                  return {
                    ...b,
                    status: 'APPROVED' as BookingStatus,
                    lpfNotes: notes || 'Disetujui oleh LPF',
                    lpfApprovedAt: now,
                    lpfApprovedBy: approver,
                  };
                }
              }
              return b;
            }),
            isSyncing: false,
          }));
        }
      },

      approveBookingYayasan: async (bookingId, notes, approverName) => {
        set({ isSyncing: true });
        try {
          const updated = await bookingsApi.updateStatus(bookingId, 'APPROVED', notes);
          set((state) => ({
            bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
            isSyncing: false,
          }));
        } catch (err: any) {
          const now = new Date().toLocaleString('id-ID');
          const approver = approverName || 'Drs. H. M. Shadiq (Yayasan YARSI)';
          set((state) => ({
            bookings: state.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: 'APPROVED' as BookingStatus,
                    yayasanNotes: notes || 'Disetujui oleh Sekretariat Yayasan YARSI',
                    yayasanApprovedAt: now,
                    yayasanApprovedBy: approver,
                  }
                : b
            ),
            isSyncing: false,
          }));
        }
      },

      rejectBooking: async (bookingId, reason, rejectedBy) => {
        set({ isSyncing: true });
        try {
          const updated = await bookingsApi.updateStatus(bookingId, 'REJECTED', reason);
          set((state) => ({
            bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
            isSyncing: false,
          }));
        } catch (err: any) {
          set((state) => ({
            bookings: state.bookings.map((b) =>
              b.id === bookingId
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
        }
      },

      returnBooking: async (bookingId, notes, returnedBy) => {
        set({ isSyncing: true });
        try {
          const updated = await bookingsApi.updateStatus(bookingId, 'RETURNED', notes);
          set((state) => ({
            bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
            isSyncing: false,
          }));
        } catch (err: any) {
          set((state) => ({
            bookings: state.bookings.map((b) =>
              b.id === bookingId
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
        }
      },

      addAcademicBlock: async (blockData) => {
        set({ isLoading: true });
        try {
          const res = await academicBulkApi.create({
            roomId: blockData.roomId,
            title: blockData.title,
            courseCode: blockData.courseCode,
            semester: blockData.semester,
            faculty: blockData.faculty,
            dayOfWeek: blockData.dayOfWeek,
            startTime: blockData.startTime,
            endTime: blockData.endTime,
            startDate: '2026-08-01',
            endDate: '2026-12-31',
          });
          const newBlock: AcademicBlock = {
            ...blockData,
            id: res.id || `acad-${Date.now()}`,
          };
          set((state) => ({
            academicBlocks: [newBlock, ...state.academicBlocks],
            isLoading: false,
          }));
          return newBlock;
        } catch (err: any) {
          const newBlock: AcademicBlock = {
            ...blockData,
            id: `acad-${Date.now()}`,
          };
          set((state) => ({
            academicBlocks: [newBlock, ...state.academicBlocks],
            isLoading: false,
          }));
          return newBlock;
        }
      },

      bulkAddAcademicBlocks: async (blocks) => {
        set({ isLoading: true });
        try {
          const promises = blocks.map((b) =>
            academicBulkApi.create({
              roomId: b.roomId,
              title: b.title,
              courseCode: b.courseCode,
              semester: b.semester,
              faculty: b.faculty,
              dayOfWeek: b.dayOfWeek,
              startTime: b.startTime,
              endTime: b.endTime,
              startDate: '2026-08-01',
              endDate: '2026-12-31',
            })
          );
          const results = await Promise.allSettled(promises);
          const createdBlocks: AcademicBlock[] = blocks.map((b, i) => {
            const res = results[i];
            const createdId =
              res.status === 'fulfilled' ? res.value.id : `acad-bulk-${Date.now()}-${i}`;
            return {
              ...b,
              id: createdId,
            };
          });
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
      name: 'siperu_yarsi_app_storage_v2',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          // Trigger background fetch
          state.fetchInitialData();
        }
      },
    }
  )
);
