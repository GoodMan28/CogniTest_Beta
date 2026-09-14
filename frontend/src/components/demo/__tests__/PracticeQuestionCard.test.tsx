import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PracticeQuestionCard from '../PracticeQuestionCard';
import type { PracticeQuestionDTO } from '../../../types/demoAnalysis';

const mcq: PracticeQuestionDTO = {
  sourceKey: 'p62-1',
  subject: 'Mathematics',
  questionType: 'multiple_choice',
  difficulty: 'easy',
  questionText: '$\\lim _{x \\rightarrow 0} \\frac{\\sqrt{1-\\cos 2 x}}{x}$',
  options: [
    'exists and equals $+\\sqrt{2}$',
    'exists and equals $-\\sqrt{2}$',
    'does not exist because $x\\to0$',
    'does not exist because the left hand limit is not equal to the right hand limit',
  ],
  correctAnswer: 'D',
  solutionText: '$\\sqrt{1-\\cos2x}=\\sqrt{2}\\,|\\sin x|$, so the one-sided limits differ.',
};

const numerical: PracticeQuestionDTO = {
  sourceKey: 'p71-2',
  subject: 'Mathematics',
  questionType: 'numerical',
  difficulty: 'medium',
  questionText: 'The limit is ____.',
  options: [],
  correctAnswer: '10.5',
  solutionText: 'Each factor contributes $-\\frac{kx^2}{2}$.',
};

const visibleText = (container: HTMLElement) => {
  // KaTeX keeps the raw source in a hidden MathML annotation; strip it
  // before asserting nothing raw leaked into the visible output.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.katex-mathml').forEach(el => el.remove());
  return clone.textContent || '';
};

describe('PracticeQuestionCard', () => {
  it('renders LaTeX in the question and options via KaTeX, with A/B/C/D labels', () => {
    const { container } = render(<PracticeQuestionCard question={mcq} />);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0);
    expect(container.querySelector('.katex-error')).toBeFalsy();
    const text = visibleText(container);
    expect(text).not.toContain('\\frac');
    expect(text).not.toContain('\\to');
    expect(text).toContain('A.');
    expect(text).toContain('D.');
    expect(text).toContain('easy');
  });

  it('hides the answer until revealed, then shows letter + option text + solution', () => {
    const { container, getByText } = render(<PracticeQuestionCard question={mcq} />);
    expect(visibleText(container)).not.toContain('Solution:');
    fireEvent.click(getByText('Check / Reveal Answer'));
    const text = visibleText(container);
    expect(text).toContain('Answer: D');
    expect(text).toContain('Solution:');
    expect(container.querySelector('.ring-green-500')).toBeTruthy();
  });

  it('shows a decimal numerical answer as-is', () => {
    const { container, getByText } = render(<PracticeQuestionCard question={numerical} />);
    fireEvent.click(getByText('Check / Reveal Answer'));
    expect(visibleText(container)).toContain('10.5');
  });
});
