import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoomType, DesignStyle, DesignPreferences, UploadedImage } from '@/types';
import { STORAGE_KEYS, GENERATION_CONSTRAINTS } from '@/utils/constants';
import { isDesignStyle } from '@/features/studio/styles';

/** One finished design. Kept in memory for this visit; saving it to an account is a separate, explicit step. */
export interface DesignVersion {
  id: string;
  /** Object URL of the generated image. */
  url: string;
  blob: Blob;
  createdAt: string;
  style: DesignStyle;
  roomType: RoomType | null;
  prompt: string;
  seed?: number;
  providerId: string;
  /** True for a colour-graded stand-in rather than an AI redesign. */
  demo: boolean;
}

export const MAX_HISTORY = 12;

interface StudioState {
  // Image
  uploadedImage: UploadedImage | null;
  generatedImageUrl: string | null;

  // Design Configuration
  roomType: RoomType | null;
  selectedStyle: DesignStyle | null;
  preferences: DesignPreferences;

  // Results
  history: DesignVersion[];
  activeVersionId: string | null;

  // Generation State
  currentJobId: string | null;
  isGenerating: boolean;
  generationError: string | null;
  generationProgress: number;

  // Actions
  setUploadedImage: (image: UploadedImage | null) => void;
  setGeneratedImageUrl: (url: string | null) => void;
  setRoomType: (type: RoomType) => void;
  setStyle: (style: DesignStyle) => void;
  setPreferences: (preferences: Partial<DesignPreferences>) => void;
  addVersion: (version: DesignVersion) => void;
  setActiveVersion: (id: string | null) => void;
  clearHistory: () => void;
  setCurrentJobId: (jobId: string | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setGenerationProgress: (progress: number) => void;
  reset: () => void;
  resetGeneration: () => void;
}

const initialPreferences: DesignPreferences = {
  intensity: GENERATION_CONSTRAINTS.defaultIntensity,
};

const releaseUrls = (versions: DesignVersion[]) => versions.forEach((v) => URL.revokeObjectURL(v.url));

const releaseImage = (image: UploadedImage | null) => {
  if (image?.preview) URL.revokeObjectURL(image.preview);
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      // Initial State
      uploadedImage: null,
      generatedImageUrl: null,
      roomType: null,
      selectedStyle: null,
      preferences: initialPreferences,
      history: [],
      activeVersionId: null,
      currentJobId: null,
      isGenerating: false,
      generationError: null,
      generationProgress: 0,

      // Actions
      setUploadedImage: (image) => {
        const state = get();
        if (state.uploadedImage && state.uploadedImage !== image) releaseImage(state.uploadedImage);
        // A new photograph starts a new set of designs.
        if (state.uploadedImage !== image) releaseUrls(state.history);
        set({
          uploadedImage: image,
          generatedImageUrl: null,
          history: state.uploadedImage === image ? state.history : [],
          activeVersionId: state.uploadedImage === image ? state.activeVersionId : null,
          generationError: null,
        });
      },

      setGeneratedImageUrl: (url) =>
        set({
          generatedImageUrl: url,
          isGenerating: false,
          generationProgress: 100,
        }),

      setRoomType: (type) => set({ roomType: type }),

      setStyle: (style) => set({ selectedStyle: style }),

      setPreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      addVersion: (version) => {
        const next = [version, ...get().history];
        const dropped = next.slice(MAX_HISTORY);
        releaseUrls(dropped);
        set({ history: next.slice(0, MAX_HISTORY), activeVersionId: version.id, generatedImageUrl: version.url });
      },

      setActiveVersion: (id) => {
        const version = get().history.find((v) => v.id === id) ?? null;
        set({ activeVersionId: version?.id ?? null, generatedImageUrl: version?.url ?? null });
      },

      clearHistory: () => {
        releaseUrls(get().history);
        set({ history: [], activeVersionId: null, generatedImageUrl: null });
      },

      setCurrentJobId: (jobId) => set({ currentJobId: jobId }),

      setIsGenerating: (generating) =>
        set({
          isGenerating: generating,
          generationError: generating ? null : undefined,
          generationProgress: generating ? 0 : undefined,
        }),

      setGenerationError: (error) =>
        set({
          generationError: error,
          isGenerating: false,
        }),

      setGenerationProgress: (progress) =>
        set({ generationProgress: Math.min(100, Math.max(0, progress)) }),

      resetGeneration: () => {
        releaseUrls(get().history);
        set({
          currentJobId: null,
          isGenerating: false,
          generationError: null,
          generationProgress: 0,
          generatedImageUrl: null,
          history: [],
          activeVersionId: null,
        });
      },

      reset: () => {
        const state = get();
        releaseUrls(state.history);
        releaseImage(state.uploadedImage);
        set({
          uploadedImage: null,
          generatedImageUrl: null,
          roomType: null,
          selectedStyle: null,
          preferences: initialPreferences,
          history: [],
          activeVersionId: null,
          currentJobId: null,
          isGenerating: false,
          generationError: null,
          generationProgress: 0,
        });
      },
    }),
    {
      name: STORAGE_KEYS.studioState,
      version: 2,
      partialize: (state) => ({
        roomType: state.roomType,
        selectedStyle: state.selectedStyle,
        preferences: state.preferences,
      }),
      // Version 1 stored the old ten style names; anything that is no longer a theme is dropped.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<Pick<StudioState, 'roomType' | 'selectedStyle' | 'preferences'>>;
        return {
          roomType: p.roomType ?? null,
          selectedStyle: isDesignStyle(p.selectedStyle) ? p.selectedStyle : null,
          preferences: { ...initialPreferences, ...(p.preferences ?? {}) },
        } as StudioState;
      },
    }
  )
);

// Selectors
export const useUploadedImage = () => useStudioStore((state) => state.uploadedImage);
export const useRoomType = () => useStudioStore((state) => state.roomType);
export const useSelectedStyle = () => useStudioStore((state) => state.selectedStyle);
export const usePreferences = () => useStudioStore((state) => state.preferences);
export const useIsGenerating = () => useStudioStore((state) => state.isGenerating);
export const useGenerationError = () => useStudioStore((state) => state.generationError);

// Check if ready to generate
export const useCanGenerate = () =>
  useStudioStore((state) => {
    return (
      state.uploadedImage !== null &&
      state.roomType !== null &&
      state.selectedStyle !== null &&
      !state.isGenerating
    );
  });
