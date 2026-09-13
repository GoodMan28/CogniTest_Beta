import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LockedFeatureCard from '../LockedFeatureCard';

describe('LockedFeatureCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title/description and makes no network request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <LockedFeatureCard
        title="Time Management Analysis"
        description="Discover exactly where you spent too much time."
      />
    );

    expect(screen.getByText('Time Management Analysis')).toBeInTheDocument();
    expect(screen.getByText('Discover exactly where you spent too much time.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
