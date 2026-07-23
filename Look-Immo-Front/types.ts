export type PropertyType = 'apartment' | 'villa' | 'depot' | 'commercial' | 'land' | 'studio' | 'duplex' | 'triplex' | 'penthouse' | 'commerce';
export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'available' | 'sold' | 'rented' | 'pending';
export type CurrencyCode = 'USD' | 'EUR' | 'TND';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  TND: number;
}

export interface UserRating {
  userId: string;
  propertyId: string;
  value: number;
  timestamp: number;
}

export interface Rating {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  value: number;
  timestamp: number;
  viewedByAdmin?: boolean;
  comment?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number; // Stored in Base Currency (TND)
  priceType?: 'total' | 'per_m2';
  location: {
    city: string;
    address: string;
    lat: number;
    lng: number;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    area: number; // sqft or m2
    parking: boolean;
    pool: boolean;
    garden?: boolean;
    airConditioning?: boolean;
    heating?: boolean;
    security?: boolean;
    vocation?: string; // e.g., "R+2", "Industriel"
    cos?: number | string; // e.g., 0.8
    propertyPlan?: string; // uploaded document URL
    ownerPaper?: string; // uploaded document URL
  };
  type: PropertyType;
  listingType: ListingType;
  status?: PropertyStatus; // New status field
  images: string[];
  agentId: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isHotDeal?: boolean;
  rating?: number; // 1-5 stars
  averageRating?: number;
  ratingsCount?: number;
  ratings?: UserRating[];
  createdAt?: number; // timestamp
  displayOrder?: number;
  ownerPhone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'agent' | 'admin';
  favorites: string[]; // Property IDs
  avatar?: string;
  registrationDate?: number; // timestamp
  lastLogin?: number; // timestamp
  viewedByAdmin?: boolean; // track if admin has viewed this user
  ratings?: Rating[];
}

export interface FilterState {
  query: string;
  listingType: ListingType | 'all';
  propertyType: PropertyType | 'all';
  minPrice: number;
  maxPrice: number;
  minBedrooms: number;
  minArea?: number;
  city: string | 'all';
  isHotDeal?: boolean;
}

export interface SiteSettings {
  websiteName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  socialMedia: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  workingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  aboutText?: string;
  discoveryLinks?: { label: string; url: string }[];
}

export interface Message {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  sentDate: number; // timestamp
  status: 'new' | 'read';
}

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyId?: string;
  propertyTitle?: string; // hydrated in frontend
  userId?: string; // legacy support
  userName?: string; // legacy support
  userEmail?: string; // legacy support
  userPhone?: string; // legacy support
  date: string; // Preferred date (YYYY-MM-DD)
  time: string; // Preferred time (HH:MM)
  message?: string; // Optional message
  notes?: string;
  source?: 'facebook' | 'instagram' | 'tiktok' | 'website' | 'whatsapp' | 'other';
  meetingType?: 'visite' | 'appel' | 'reunion';
  createdAt?: string | number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ClientDemand {
  id: string;
  clientName: string;
  phone?: string;
  description: string;
  location: string;
  type: 'appartement' | 'villa' | 'terrain' | 'bureau' | 'commerce';
  budget?: number;
  priority: 'high' | 'medium' | 'low';
  status: 'searching' | 'contacted' | 'matched' | 'closed';
  createdAt: number;
  updatedAt: number;
  ignoredPropertyIds?: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  createdAt: number;
  updatedAt: number;
  published?: boolean;
}

export interface OrganicVisit {
  id: string;
  visitorName: string;
  idCardNumber: string;
  propertyVisited: string;
  visitDate: number; // timestamp, auto-generated
}



export interface FinanceTransaction {
  id: string;
  type: 'vente' | 'location';
  propertyTitle: string;
  clientName: string;
  date: string;
  commission: number;
  paymentReceived: boolean;
  paymentMode: 'espèces' | 'virement' | 'chèque';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  displayOrder: number;
  createdAt?: string | number;
}

export interface SiteNotification {
  id: string;
  type: string;
  title?: string;
  message: string;
  icon?: string;
  link?: string;
  read: boolean;
  metadata?: { demandId?: string; [key: string]: unknown };
  createdAt: string;
  user?: { id: string; name: string } | null;
}

