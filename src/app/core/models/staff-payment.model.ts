export type StaffPaymentType = 'fixed' | 'commission' | 'mixed';
export type StaffPaymentFrequency = 'weekly' | 'biweekly' | 'monthly';
export type StaffPaymentStatus = 'open' | 'closed' | 'paid';
export type StaffPaymentMethod = 'cash' | 'transfer' | 'other';

export interface StaffPaymentConfigRequest {
    paymentType: StaffPaymentType;
    fixedAmount?: number | null;
    commissionPercentage?: number | null;
    commissionBase?: StaffCommissionBase | null;
    frequency?: StaffPaymentFrequency | null;
    paymentDay?: number | null;
}

export interface StaffPaymentConfigResponse {
    id: string;
    userId: string;
    userName: string;
    paymentType: StaffPaymentType;
    fixedAmount?: number | null;
    commissionPercentage?: number | null;
    commissionBase?: StaffCommissionBase | null;
    frequency?: StaffPaymentFrequency | null;
    paymentDay?: number | null;
    isActive: boolean;
}

export const STAFF_COMMISSION_BASE_LABELS: Record<StaffCommissionBase, string> = {
    services_only: 'Solo servicios',
    services_and_products: 'Servicios y productos'
};

export interface GenerateStaffPaymentPeriodRequest {
    periodStart: string;
    periodEnd: string;
}

export interface StaffPaymentPeriodResponse {
    id: string;
    userId: string;
    userName: string;
    configId: string;
    periodStart: string;
    periodEnd: string;
    fixedAmount: number;
    commissionAmount: number;
    totalSales: number;
    totalServices: number;
    grossAmount: number;
    paidAmount: number;
    pendingAmount: number;
    status: StaffPaymentStatus;
}

export interface RegisterStaffPaymentRequest {
    amount: number;
    paymentMethod: StaffPaymentMethod;
    reference?: string | null;
    notes?: string | null;
}

export interface StaffPaymentResponse {
    id: string;
    periodId: string;
    userId: string;
    userName: string;
    paidBy?: string | null;
    paidByName?: string | null;
    amount: number;
    paymentMethod: StaffPaymentMethod;
    reference?: string | null;
    notes?: string | null;
    paidAt: string;
    status: StaffPaymentRecordStatus;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    cancelledByName?: string | null;
    cancelReason?: string | null;
}

export const STAFF_PAYMENT_TYPE_LABELS: Record<StaffPaymentType, string> = {
    fixed: 'Sueldo fijo',
    commission: 'Comisión',
    mixed: 'Mixto'
};

export const STAFF_PAYMENT_FREQUENCY_LABELS: Record<StaffPaymentFrequency, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual'
};

export const STAFF_PAYMENT_STATUS_LABELS: Record<StaffPaymentStatus, string> = {
    open: 'En revisión',
    closed: 'Listo para pagar',
    paid: 'Pagado'
};

export const STAFF_PAYMENT_METHOD_LABELS: Record<StaffPaymentMethod, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    other: 'Otro'
};

export interface StaffPaymentSummaryResponse {
    pendingAmount: number;
    readyToPayAmount: number;
    reviewAmount: number;
    paidAmount: number;
    pendingPeriods: number;
    readyPeriods: number;
    reviewPeriods: number;
    paidPeriods: number;
    totalPeriods: number;
}

export type StaffPaymentCardStatus =
    | 'not_configured'
    | 'configured'
    | 'pending'
    | 'ready'
    | 'review'
    | 'paid';

export interface StaffPaymentCardSummaryResponse {
    userId: string;
    configured: boolean;
    paymentType?: StaffPaymentType | null;
    pendingAmount: number;
    readyToPayAmount: number;
    reviewAmount: number;
    paidAmount: number;
    readyPeriods: number;
    reviewPeriods: number;
    paidPeriods: number;
    cardStatus: StaffPaymentCardStatus;
}

export interface StaffPaymentHistoryResponse {
    id: string;
    periodId: string;
    userId: string;
    userName: string;
    periodStart: string;
    periodEnd: string;
    paidBy?: string | null;
    paidByName?: string | null;
    amount: number;
    paymentMethod: StaffPaymentMethod;
    reference?: string | null;
    notes?: string | null;
    paidAt: string;
    status: StaffPaymentRecordStatus;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    cancelledByName?: string | null;
    cancelReason?: string | null;
}

export interface StaffPaymentHistoryFilters {
    userId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    paymentMethod?: StaffPaymentMethod | 'all' | null;
}

export type StaffPaymentRecordStatus = 'active' | 'cancelled';

export interface CancelStaffPaymentRequest {
    reason: string;
}

export interface StaffPaymentPeriodSaleResponse {
    saleId: string;
    clientName: string;
    itemSummary: string;
    paymentMethod: StaffPaymentMethod;
    total: number;
    createdAt: string;
}

export type StaffCommissionBase = 'services_only' | 'services_and_products';
