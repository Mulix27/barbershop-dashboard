export interface SaleItem {
  id?: string;
  itemType: 'service' | 'product';
  itemRefId: string;
  itemName?: string;
  unitPrice?: number;
  quantity: number;
  total?: number;
}

export interface Sale {
  id: string;
  clientId?: string;
  clientName: string;
  attendedBy?: string;
  attendedByUser?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  items: SaleItem[];
  createdAt: string;
  origin?: 'appointment' | 'pos';
  notes?: string | null;
}

export interface SaleRequest {
  clientId?: string;
  attendedByUserId?: string;
  paymentMethod: string;
  discount?: number;
  notes?: string;
  items: SaleItem[];
}