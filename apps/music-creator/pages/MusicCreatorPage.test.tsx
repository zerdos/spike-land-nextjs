import { render, screen, fireEvent } from '@testing-library/react';
import MusicCreatorPage from './MusicCreatorPage';
import React from 'react';

import { vi } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Audio
class AudioMock {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  muted = false;
  volume = 1;
  currentTime = 0;
  src = '';

  constructor(src: string) {
    this.src = src;
  }
}
global.Audio = AudioMock as any;

describe('MusicCreatorPage', () => {
  it('renders the page title', () => {
    render(<MusicCreatorPage />);
    expect(screen.getByText('Music Creator')).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    render(<MusicCreatorPage />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Record')).toBeInTheDocument();
    expect(screen.getByText('Add Track')).toBeInTheDocument();
  });

  // More interactions would require mocking MediaRecorder and more complex state,
  // but this ensures the component renders and basic structure is there.
});
