/**
 * Studio copy for each experience. Elegant reads as a premium design tool with no
 * supernatural cues; Haunted keeps the same meaning in the haunted-mansion voice.
 */

export interface StudioCopy {
  assistantName: string;
  assistantRole: string;
  uploadTitle: string;
  uploadHeadline: string;
  uploadHint: string;
  generateLabel: string;
  generatingLabel: string;
  generatingTitle: string;
  stages: { queued: string; developing: string; ready: string; failed: string };
  messages: {
    welcome: string;
    selectRoom: string;
    selectStyle: string;
    ready: string;
    generating: string;
    done: string;
  };
  resultTitle: string;
  resultCaption: string;
  furnitureTitle: string;
  furnitureHint: string;
}

export const ELEGANT_COPY: StudioCopy = {
  assistantName: 'Design Assistant',
  assistantRole: 'Guidance for each step',
  uploadTitle: 'Upload Photo',
  uploadHeadline: 'Upload your room photo',
  uploadHint: 'Drag and drop or click to browse',
  generateLabel: 'Generate Design',
  generatingLabel: 'Generating...',
  generatingTitle: 'Designing your space...',
  stages: {
    queued: 'Queued',
    developing: 'Designing',
    ready: 'Your design is ready',
    failed: 'We could not complete this design',
  },
  messages: {
    welcome: 'Start with a clear, well-lit photo of the room you would like to redesign.',
    selectRoom: 'Tell us which kind of room this is so the layout suggestions fit.',
    selectStyle: 'Choose the style you would like to see in your space.',
    ready: 'Everything is set. Generate your design when you are ready.',
    generating: 'Your design is being prepared. This usually takes under a minute.',
    done: 'Your design is ready. Compare the before and after below.',
  },
  resultTitle: 'Your redesigned room',
  resultCaption: 'Drag the handle to compare.',
  furnitureTitle: 'Furniture to replace',
  furnitureHint: 'Choose the pieces you would like swapped for ones in your chosen style.',
};

export const HAUNTED_COPY: StudioCopy = {
  assistantName: 'Mori',
  assistantRole: 'Something keeps watch',
  uploadTitle: 'The Seance Table',
  uploadHeadline: 'Every room has a story. Show us yours.',
  uploadHint: 'Drag a photograph here, or click to lay it on the table',
  generateLabel: 'Develop the Photograph',
  generatingLabel: 'Developing...',
  generatingTitle: 'Reconstructing your space...',
  stages: {
    queued: 'Waiting in the darkroom',
    developing: 'Developing',
    ready: 'The photograph has developed',
    failed: 'The photograph would not develop',
  },
  messages: {
    welcome: 'Lay a photograph of the room on the table. Do not look too long at the corners.',
    selectRoom: 'Which room is it? Rooms remember what happened in them.',
    selectStyle: 'Choose a style. Some of them were here before you.',
    ready: 'The photograph is ready to develop. Are you?',
    generating: 'Stay where you are. It is nearly done.',
    done: 'It developed. Compare what is there now with what was there before.',
  },
  resultTitle: 'What developed',
  resultCaption: 'Drag the handle between then and now.',
  furnitureTitle: 'Furniture to replace',
  furnitureHint: 'Spirits cling to old furniture. Replace the right pieces and they must leave.',
};

export const getStudioCopy = (haunted: boolean): StudioCopy => (haunted ? HAUNTED_COPY : ELEGANT_COPY);
