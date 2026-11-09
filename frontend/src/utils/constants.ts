// Application Constants

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const COGNITO_CONFIG = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  region: import.meta.env.VITE_COGNITO_REGION || 'us-west-2',
};

export const FEATURE_FLAGS = {
  hauntedMode: import.meta.env.VITE_ENABLE_HAUNTED !== 'false',
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
};

// File Upload Constraints
export const UPLOAD_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  minDimension: 512,
  /** Photographs above this are refused; anything above 2048 is shrunk before use. */
  maxDimension: 12000,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

// Generation Constraints
export const GENERATION_CONSTRAINTS = {
  maxCustomInstructions: 500,
  defaultIntensity: 0.7,
  pollInterval: 3000, // 3 seconds
  maxPollTime: 90000, // 90 seconds
};

// User Quotas
export const USER_QUOTAS = {
  dailyGenerations: 10,
  maxProjects: 100,
  maxStorageMB: 500,
};

// Animation Durations (ms)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
};

// Routes
export const ROUTES = {
  home: '/',
  studio: '/studio',
  gallery: '/gallery',
  project: (id: string) => `/gallery/${id}`,
  howItWorks: '/how-it-works',
  about: '/about',
  signIn: '/signin',
  signUp: '/signup',
  forgotPassword: '/forgot-password',
  account: '/account',
  notFound: '/404',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  tokens: 'hoomefy_tokens',
  hauntedMode: 'hoomefy_haunted_mode',
  studioState: 'hoomefy_studio_state',
};

// API Endpoints
export const API_ENDPOINTS = {
  uploads: '/api/uploads',
  generations: '/api/generations',
  generationStatus: (jobId: string) => `/api/generations/${jobId}`,
  projects: '/api/projects',
  project: (id: string) => `/api/projects/${id}`,
  account: '/api/account',
  usage: '/api/usage',
};

// Error Messages
export const ERROR_MESSAGES = {
  uploadFailed: 'Failed to upload image. Please try again.',
  generationFailed: 'Failed to generate design. Please try again.',
  invalidFile: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
  fileTooLarge: 'File is too large. Maximum size is 10MB.',
  imageTooSmall: 'Image is too small. Minimum dimension is 512px.',
  imageTooLarge: 'Image is too large. Maximum dimension is 12000px.',
  networkError: 'Network error. Please check your connection.',
  unauthorized: 'Please sign in to continue.',
  quotaExceeded: 'Daily generation limit reached. Please try again tomorrow.',
  serverError: 'Something went wrong. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  uploadSuccess: 'Image uploaded successfully!',
  generationSuccess: 'Your design is ready!',
  projectSaved: 'Project saved to gallery!',
  projectDeleted: 'Project deleted successfully.',
  signInSuccess: 'Welcome back!',
  signUpSuccess: 'Account created successfully!',
};

// Mori Messages
export const MORI_MESSAGES = {
  welcome: "Let's give this space a little magic.",
  uploading: 'Preparing your room for transformation...',
  generating: 'Your new look is almost ready!',
  success: 'Careful... this design might be too beautiful to haunt.',
  selectStyle: 'Which style speaks to your soul?',
  selectRoom: 'Tell me about this enchanting space.',
  preferences: 'Would you like something brighter, cozier, or more luxurious?',
  error: 'Even ghosts make mistakes. Let\'s try again!',
};
