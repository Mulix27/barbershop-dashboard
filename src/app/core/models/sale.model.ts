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
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  items: SaleItem[];
  createdAt: string;
}
 
export interface SaleRequest {
  clientId?: string;
  attendedByUserId?: string;
  paymentMethod: string;
  discount?: number;
  notes?: string;
  items: SaleItem[];
}