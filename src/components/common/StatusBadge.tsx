'use client';

import React from 'react';
import { BookingStatus } from '@/lib/types';
import { getStatusBadgeConfig } from '@/lib/utils';
import {
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  CheckCheck,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const config = getStatusBadgeConfig(status);

  const darkStatusClasses: Record<BookingStatus, string> = {
    PENDING: 'dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/40',
    PENDING_LPF: 'dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/40',
    VERIFIED: 'dark:bg-indigo-500/10 dark:text-indigo-200 dark:border-indigo-500/40',
    RECOMMENDED: 'dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/40',
    RECOMMENDED_YAYASAN: 'dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/40',
    APPROVED: 'dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/40',
    REJECTED: 'dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/40',
    RETURNED: 'dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/40',
    CANCELLED: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    COMPLETED: 'dark:bg-teal-500/10 dark:text-teal-200 dark:border-teal-500/40',
    ACADEMIC_BLOCKED: 'dark:bg-purple-500/10 dark:text-purple-200 dark:border-purple-500/40',
    EXPIRED: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    RESCHEDULE_PENDING: 'dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/40',
    NO_SHOW: 'dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/40',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const renderIcon = () => {
    const iconClass = iconSizeClasses[size];
    switch (status) {
      case 'PENDING_LPF':
        return <Clock className={iconClass} />;
      case 'VERIFIED':
        return <ShieldCheck className={iconClass} />;
      case 'RECOMMENDED_YAYASAN':
        return <Building2 className={iconClass} />;
      case 'APPROVED':
        return <CheckCircle2 className={iconClass} />;
      case 'REJECTED':
        return <XCircle className={iconClass} />;
      case 'CANCELLED':
        return <Ban className={iconClass} />;
      case 'RETURNED':
        return <RotateCcw className={iconClass} />;
      case 'COMPLETED':
        return <CheckCheck className={iconClass} />;
      case 'ACADEMIC_BLOCKED':
        return <GraduationCap className={iconClass} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-lg border shadow-[0_1px_1px_rgba(15,23,42,0.04)] ${config.bg} ${darkStatusClasses[status]} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <span aria-hidden="true">{renderIcon()}</span>}
      <span>{config.label}</span>
    </span>
  );
}
