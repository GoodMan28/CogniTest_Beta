import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionReview from '../QuestionReview';
import { studentAReportDetail } from './fixtures';

const noopGetPractice = vi.fn().mockResolvedValue([]);
const noopUpdateReflection = vi.fn().mockResolvedValue(undefined);

describe('QuestionReview', () => {
  it('shows the numerical answer "0" as a real value, not "not attempted"', () => {
    render(
      <QuestionReview
        report={studentAReportDetail}
        getPracticeQuestions={noopGetPractice}
        updateReflection={noopUpdateReflection}
      />
    );
    // Q2's studentAnswer is the string "0" — must render as "0", not fall
    // into the "Not attempted" branch (which only "" / null / undefined use).
    // Both "Your Answer" and "Correct Answer" show "0" for this question,
    // so assert there are at least two matches rather than a unique one.
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Not attempted')).not.toBeInTheDocument();
  });

  it('shows "Skipped" for a question with a null studentAnswer', () => {
    render(
      <QuestionReview
        report={studentAReportDetail}
        getPracticeQuestions={noopGetPractice}
        updateReflection={noopUpdateReflection}
      />
    );
    expect(screen.getByText('- Skipped')).toBeInTheDocument();
  });

  it('filter counts match the snapshot status counts exactly', () => {
    render(
      <QuestionReview
        report={studentAReportDetail}
        getPracticeQuestions={noopGetPractice}
        updateReflection={noopUpdateReflection}
      />
    );
    // Student A: 3 correct, 0 incorrect, 1 skipped, 4 total.
    expect(screen.getByRole('button', { name: /all \(4\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /correct \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /incorrect \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skipped \(1\)/i })).toBeInTheDocument();
  });

  it('filtering to "skipped" shows only Q3', () => {
    render(
      <QuestionReview
        report={studentAReportDetail}
        getPracticeQuestions={noopGetPractice}
        updateReflection={noopUpdateReflection}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /skipped \(1\)/i }));
    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.queryByText('Q1')).not.toBeInTheDocument();
  });
});
