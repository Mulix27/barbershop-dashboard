export interface HaircutCatalogItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  price: number;
  durationMin: number;
  isActive: boolean;
}
 
export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  stock: number;
  stockMin: number;
  isActive: boolean;
  lowStock: boolean;
}