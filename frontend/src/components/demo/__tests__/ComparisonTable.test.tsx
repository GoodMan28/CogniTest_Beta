import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComparisonTable from '../ComparisonTable';
import { studentAReportDetail, studentDReportDetail } from './fixtures';

describe('ComparisonTable', () => {
  it('renders class average and topper score when available', () => {
    render(<ComparisonTable report={studentAReportDetail} />);
    expect(screen.getByText('8.67')).toBeInTheDocument();
    expect(screen.getByText("Joint toppers' average")).toBeInTheDocument();
  });

  it('renders the unavailable reason for a single-student cohort instead of a table', () => {
    render(<ComparisonTable report={studentDReportDetail} />);
    expect(screen.getByText('Comparison unavailable: only one evaluated student.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
