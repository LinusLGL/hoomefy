// Core Types for Hoomefy

export type RoomType =
  | 'living-room'
  | 'bedroom'
  | 'kitchen'
  | 'dining-room'
  | 'office'
  | 'bathroom'
  | 'other';

/** The five built-in themes, plus a free-text style the user writes themselves. */
export type DesignStyle = 'scandinavian' | 'japandi' | 'modern-luxury' | 'minimalist' | 'halloween' | 'custom';

export type ColorPalette = 'warm' | 'cool' | 'neutral' | 'bold';

/** Categories of furniture a user can choose to replace (and that a spirit can be bound to). */
export type FurnitureKey = 'seating' | 'bed' | 'tables' | 'lighting' | 'storage' | 'rugs' | 'decor';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DesignPreferences {
  colorPalette?: ColorPalette;
  intensity?: number; // 0.0 - 1.0
  customInstructions?: string;
  /** The user's own style description, used when the style is "custom". */
  customStyle?: string;
  /** Total budget in USD for furniture, used by the shopping list. */
  budget?: number;
  /** Furniture categories the user wants replaced with pieces in the chosen style. */
  replaceFurniture?: FurnitureKey[];
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  hauntedModeEnabled: boolean;
  createdAt: string;
}

export interface Tokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  roomType: RoomType;
  style: DesignStyle;
  preferences: DesignPreferences;
  originalImageKey: string;
  generatedImageKey: string;
  originalImageUrl?: string; // Presigned URL
  generatedImageUrl?: string; // Presigned URL
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  jobId: string;
  userId: string;
  projectId: string;
  status: JobStatus;
  originalImageKey: string;
  generatedImageKey: string | null;
  roomType: RoomType;
  style: DesignStyle;
  preferences: DesignPreferences;
  errorMessage: string | null;
  progress?: number;
  createdAt: string;
  completedAt: string | null;
}

export interface UploadedImage {
  /** The photograph exactly as the user supplied it. Never sent anywhere. */
  file: File;
  /** Object URL of the upright, EXIF-free copy shown in the studio. */
  preview: string;
  /** The compressed, EXIF-free copy that is sent to the AI service. */
  inference?: Blob;
  /** Size of the inference copy, a multiple of 8 and at most 1024 on the long side. */
  width?: number;
  height?: number;
  /** Size of the original photograph in pixels. */
  originalWidth?: number;
  originalHeight?: number;
  /** Legacy storage key, only set by the old mock upload service. */
  key?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    cursor?: string;
    count?: number;
  };
}

// Style Information
export interface StyleInfo {
  id: DesignStyle;
  name: string;
  description: string;
  preview: string;
  tags: string[];
}

// Room Type Information
export interface RoomTypeInfo {
  id: RoomType;
  name: string;
  icon: string;
}

export const ROOM_TYPES: Record<RoomType, RoomTypeInfo> = {
  'living-room': { id: 'living-room', name: 'Living Room', icon: 'Sofa' },
  bedroom: { id: 'bedroom', name: 'Bedroom', icon: 'Bed' },
  kitchen: { id: 'kitchen', name: 'Kitchen', icon: 'CookingPot' },
  'dining-room': { id: 'dining-room', name: 'Dining Room', icon: 'Utensils' },
  office: { id: 'office', name: 'Home Office', icon: 'Laptop' },
  bathroom: { id: 'bathroom', name: 'Bathroom', icon: 'Bath' },
  other: { id: 'other', name: 'Other', icon: 'Home' },
};

export const DESIGN_STYLES: Record<DesignStyle, StyleInfo> = {
  scandinavian: {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light wood, white walls and cozy wool textiles.',
    preview: '',
    tags: ['cozy', 'light', 'natural'],
  },
  japandi: {
    id: 'japandi',
    name: 'Japandi',
    description: 'Japanese calm meets Scandinavian warmth, in natural materials.',
    preview: '',
    tags: ['zen', 'natural', 'balanced'],
  },
  'modern-luxury': {
    id: 'modern-luxury',
    name: 'Modern Luxury',
    description: 'Velvet, marble and brass in a rich, layered palette.',
    preview: '',
    tags: ['luxury', 'bold', 'premium'],
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean lines, few pieces and quiet neutral colours.',
    preview: '',
    tags: ['minimal', 'clean', 'calm'],
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    description: 'Tasteful spooky: candlelight, pumpkins, velvet and cobwebs.',
    preview: '',
    tags: ['spooky', 'moody', 'seasonal'],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Describe the look you want in your own words.',
    preview: '',
    tags: ['your words'],
  },
};