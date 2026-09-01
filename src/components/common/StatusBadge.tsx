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
      className={`inline-flex items-center whitespace-nowrap rounded-lg border shadow-[0_1px_1px_rgba(15,23,42,0.04)] ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <span aria-hidden="true">{renderIcon()}</span>}
      <span>{config.label}</span>
    </span>
  );
}
