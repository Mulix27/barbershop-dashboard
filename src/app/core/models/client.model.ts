export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  haircuts?: ClientHaircut[];
}
 
export interface ClientHaircut {
  id: string;
  type: 'hair' | 'beard' | 'combo';
  name: string;
  description?: string;
  isPreferred: boolean;
  photos?: HaircutPhoto[];
  createdAt: string;
}
 
export interface HaircutPhoto {
  id: string;
  url: string;
  publicId: string;
  storageProvider: string;
  takenAt: string;
  notes?: string;
  uploadedBy?: string;
}