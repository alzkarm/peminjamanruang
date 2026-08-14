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
} from './types';
import {
  INITIAL_ROOMS,
  INITIAL_BOOKINGS,
  INITIAL_ACADEMIC_BLOCKS,
  INITIAL_FEEDBACKS,
  DEMO_USERS,
} from './mockData';

interface AppState {
  currentUser: UserSession;
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  feedbacks: Feedback[];
  hasHydrated: boolean;

  // Auth actions
  setCurrentUser: (user: UserSession) => void;
  loginAsRole: (role: Role) => void;
  logout: () => void;

  // Booking actions
  addBooking: (
    newBooking: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'qrCodeToken' | 'status'
    >
  ) => Booking;
  cancelBooking: (bookingId: string) => void;
  approveBookingLPF: (
    bookingId: string,
    notes?: string,
    approverName?: string
  ) => void;
  approveBookingYayasan: (
    bookingId: string,
    notes?: string,
    approverName?: string
  ) => void;
  rejectBooking: (
    bookingId: string,
    reason: string,
    rejectedBy: string
  ) => void;

  // Academic bulk blocker actions
  addAcademicBlock: (block: Omit<AcademicBlock, 'id'>) => AcademicBlock;
  bulkAddAcademicBlocks: (blocks: Omit<AcademicBlock, 'id'>[]) => void;
  deleteAcademicBlock: (id: string) => void;
  toggleAcademicBlock: (id: string) => void;

  // Feedback actions
  addFeedback: (
    feedback: Omit<Feedback, 'id' | 'createdAt'>
  ) => Feedback;

  // Reset to initial mock
  resetToDefault: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: DEMO_USERS[0], // default as student
      rooms: INITIAL_ROOMS,
      bookings: INITIAL_BOOKINGS,
      academicBlocks: INITIAL_ACADEMIC_BLOCKS,
      feedbacks: INITIAL_FEEDBACKS,
      hasHydrated: false,

      setCurrentUser: (user) => set({ currentUser: user }),

      loginAsRole: (role) => {
        const found = DEMO_USERS.find((u) => u.role === role);
        if (found) {
          set({ currentUser: found });
        }
      },

      logout: () => {
        set({
          currentUser: {
            id: 'guest',
            name: 'Tamu / Pengunjung',
            identifier: 'GUEST',
            role: 'mahasiswa',
            email: 'guest@yarsi.ac.id',
            department: 'Civitas Academica',
            phone: '',
          },
        });
      },

      addBooking: (bookingData) => {
        const count = get().bookings.length + 1;
        const paddedIndex = count.toString().padStart(4, '0');
        const bookingCode = `YARSI-BK-2026-${paddedIndex}`;
        const newId = `bk-${Date.now()}`;
        const now = new Date();
        const createdAt = `${now.toISOString().slice(0, 10)} ${now
          .toTimeString()
          .slice(0, 5)}`;
        const qrCodeToken = `QR-YARSI-${paddedIndex}-SEC-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

        // Status determination
        // Initial status is PENDING_LPF
        const initialStatus: BookingStatus = 'PENDING_LPF';

        const newBooking: Booking = {
          ...bookingData,
          id: newId,
          bookingCode,
          status: initialStatus,
          createdAt,
          qrCodeToken,
          feedbackSubmitted: false,
        };

        set((state) => ({
          bookings: [newBooking, ...state.bookings],
        }));

        return newBooking;
      },

      cancelBooking: (bookingId) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'CANCELLED' as BookingStatus } : b
          ),
        }));
      },

      approveBookingLPF: (bookingId, notes, approverName) => {
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now
          .toTimeString()
          .slice(0, 5)}`;
        const approver = approverName || 'Bambang Sudibyo (LPF)';

        set((state) => ({
          bookings: state.bookings.map((b) => {
            if (b.id === bookingId) {
              if (b.requiresYayasanApproval) {
                // Forward to Yayasan
                return {
                  ...b,
                  status: 'RECOMMENDED_YAYASAN' as BookingStatus,
                  lpfNotes: notes || 'Diverifikasi LPF & Direkomendasikan ke Yayasan',
                  lpfApprovedAt: timestamp,
                  lpfApprovedBy: approver,
                };
              } else {
                // Direct Approve
                return {
                  ...b,
                  status: 'APPROVED' as BookingStatus,
                  lpfNotes: notes || 'Disetujui oleh LPF',
                  lpfApprovedAt: timestamp,
                  lpfApprovedBy: approver,
                };
              }
            }
            return b;
          }),
        }));
      },

      approveBookingYayasan: (bookingId, notes, approverName) => {
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now
          .toTimeString()
          .slice(0, 5)}`;
        const approver = approverName || 'Drs. H. M. Shadiq (Yayasan YARSI)';

        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: 'APPROVED' as BookingStatus,
                  yayasanNotes: notes || 'Disetujui oleh Sekretariat Yayasan YARSI',
                  yayasanApprovedAt: timestamp,
                  yayasanApprovedBy: approver,
                }
              : b
          ),
        }));
      },

      rejectBooking: (bookingId, reason, rejectedBy) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: 'REJECTED' as BookingStatus,
                  rejectionReason: reason,
                  lpfNotes: `Ditolak oleh ${rejectedBy}: ${reason}`,
                }
              : b
          ),
        }));
      },

      addAcademicBlock: (blockData) => {
        const newId = `acad-${Date.now()}`;
        const newBlock: AcademicBlock = {
          ...blockData,
          id: newId,
        };
        set((state) => ({
          academicBlocks: [newBlock, ...state.academicBlocks],
        }));
        return newBlock;
      },

      bulkAddAcademicBlocks: (blocks) => {
        const newBlocks: AcademicBlock[] = blocks.map((b, index) => ({
          ...b,
          id: `acad-bulk-${Date.now()}-${index}`,
        }));
        set((state) => ({
          academicBlocks: [...newBlocks, ...state.academicBlocks],
        }));
      },

      deleteAcademicBlock: (id) => {
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

      addFeedback: (feedbackData) => {
        const newId = `fb-${Date.now()}`;
        const now = new Date();
        const createdAt = `${now.toISOString().slice(0, 10)} ${now
          .toTimeString()
          .slice(0, 5)}`;
        const newFeedback: Feedback = {
          ...feedbackData,
          id: newId,
          createdAt,
        };

        set((state) => ({
          feedbacks: [newFeedback, ...state.feedbacks],
          bookings: state.bookings.map((b) =>
            b.id === feedbackData.bookingId
              ? { ...b, feedbackSubmitted: true, status: 'COMPLETED' as BookingStatus }
              : b
          ),
        }));

        return newFeedback;
      },

      resetToDefault: () => {
        set({
          rooms: INITIAL_ROOMS,
          bookings: INITIAL_BOOKINGS,
          academicBlocks: INITIAL_ACADEMIC_BLOCKS,
          feedbacks: INITIAL_FEEDBACKS,
          currentUser: DEMO_USERS[0],
        });
      },
    }),
    {
      name: 'yarsi_pinjam_ruang_storage_v1',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
