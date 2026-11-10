import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreferencesPanel } from './PreferencesPanel';
import { GenerationProgress } from './GenerationProgress';
import { UploadContainer } from '@/components/upload/UploadContainer';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { useStudioStore } from '@/stores/studioStore';
import { WHISPERS, WHISPER_LABEL } from '@/features/ritual/copy';
import type { GenerationJob } from '@/types';

const setExperience = (experience: 'elegant' | 'haunted') => useHauntingStore.setState({ experience });

// jsdom has no object URLs; the studio store frees the photograph's URL when it is cleared.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => setExperience('elegant'));
afterEach(() => {
  setExperience('elegant');
  useStudioStore.getState().reset();
});

describe('PreferencesPanel: the guide for the extra instructions', () => {
  it('is the plain "Extra instructions" box, with no guide, in the Elegant experience', () => {
    render(<PreferencesPanel preferences={{}} onChange={() => undefined} />);
    expect(screen.getByLabelText(/Extra instructions/)).toBeInTheDocument();
    expect(screen.queryByTestId('whisper-guide')).toBeNull();
    expect(screen.queryByText(WHISPER_LABEL)).toBeNull();
  });

  it('becomes "Whisper your wishes" with a spooky guide in the Haunted experience', () => {
    setExperience('haunted');
    render(<PreferencesPanel preferences={{}} onChange={() => undefined} />);
    const box = screen.getByLabelText(new RegExp(WHISPER_LABEL));
    expect(box).toHaveAttribute('id', 'custom-instructions');
    expect(screen.getByTestId('whisper-guide')).toHaveTextContent('How to whisper to the spirits');
    for (const phrase of WHISPERS) expect(screen.getByRole('button', { name: phrase })).toBeInTheDocument();
  });

  it('writes a whisper into the box when it is chosen, after what is already there', async () => {
    setExperience('haunted');
    const onChange = vi.fn();
    render(<PreferencesPanel preferences={{ customInstructions: 'Add more plants' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: WHISPERS[2] }));
    expect(onChange).toHaveBeenLastCalledWith({ customInstructions: `Add more plants. ${WHISPERS[2]}` });
  });

  it('cannot be used while a design is being made', () => {
    setExperience('haunted');
    render(<PreferencesPanel preferences={{}} onChange={() => undefined} disabled />);
    expect(screen.getByRole('button', { name: WHISPERS[0] })).toBeDisabled();
  });
});

const job = (status: GenerationJob['status']): GenerationJob =>
  ({ jobId: 'j1', status, errorMessage: status === 'failed' ? 'It did not work.' : null }) as unknown as GenerationJob;

describe('GenerationProgress on the Ouija board', () => {
  it('shows only the status in a plate (the photograph develops on the polaroid itself)', () => {
    setExperience('haunted');
    render(<GenerationProgress variant="board" job={job('processing')} imageSrc="blob:photo" onCancel={() => undefined} />);
    const panel = screen.getByTestId('generation-progress');
    expect(panel).toHaveAttribute('data-stage', 'developing');
    expect(panel).toHaveClass('rt-plate');
    expect(panel.querySelector('img')).toBeNull();
    expect(screen.getByTestId('generation-stage')).toHaveTextContent('Developing');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('still carries its own photograph in the ordinary card variant', () => {
    setExperience('haunted');
    render(<GenerationProgress job={job('processing')} imageSrc="blob:photo" />);
    expect(screen.getByTestId('generation-progress').querySelector('img')).not.toBeNull();
  });

  it('offers to try again, or to show a demo, when the photograph would not develop', () => {
    setExperience('haunted');
    const onRetry = vi.fn();
    const onDemo = vi.fn();
    render(<GenerationProgress variant="board" job={job('failed')} imageSrc="blob:photo" errorCode="unavailable" onRetry={onRetry} onDemo={onDemo} />);
    fireEvent.click(screen.getByTestId('retry-generation'));
    fireEvent.click(screen.getByTestId('demo-generation'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDemo).toHaveBeenCalledTimes(1);
  });
});

describe('UploadContainer as the polaroid window', () => {
  const photo = {
    file: new File(['x'], 'room.png', { type: 'image/png' }),
    preview: 'blob:room',
    inference: new Blob(['x']),
    width: 800,
    height: 600,
    originalWidth: 800,
    originalHeight: 600,
  };

  it('is a drop area with the file chooser when there is no photograph', () => {
    setExperience('haunted');
    render(<UploadContainer variant="polaroid" />);
    expect(screen.getByTestId('polaroid-dropzone')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
    expect(screen.getByText('Every room has a story. Show us yours.')).toBeInTheDocument();
    expect(screen.queryByTestId('polaroid-photo')).toBeNull();
  });

  it('shows the photograph in the window, with the name as its text and the stage it has reached', () => {
    setExperience('haunted');
    useStudioStore.getState().setUploadedImage(photo as never);
    render(<UploadContainer variant="polaroid" stage="developing" overlay={<button type="button">Begin</button>} />);
    const img = screen.getByTestId('polaroid-photo');
    expect(img).toHaveAttribute('alt', 'room.png');
    expect(img).toHaveAttribute('src', 'blob:room');
    expect(img).toHaveAttribute('data-stage', 'developing');
    expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument();
    // the file chooser stays, so "Replace photo" can open it
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('keeps the old card layout for the Elegant experience', () => {
    render(<UploadContainer />);
    expect(screen.queryByTestId('polaroid-dropzone')).toBeNull();
    expect(screen.getByTestId('privacy-note')).toBeInTheDocument();
  });

  it('rejects a file that is not a picture, and says so on the card', () => {
    setExperience('haunted');
    render(<UploadContainer variant="polaroid" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid file type');
  });
});
