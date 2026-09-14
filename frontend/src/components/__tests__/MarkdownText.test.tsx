import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownText from '../MarkdownText';

describe('MarkdownText', () => {
  it('renders \\frac, \\tan and \\theta via KaTeX with no raw LaTeX artifacts', () => {
    const { container } = render(
      <MarkdownText text={'$\\frac{H}{R}=\\frac{1}{4} \\tan \\theta$'} />
    );
    expect(container.querySelector('.katex')).toBeTruthy();
    expect(container.querySelector('.katex-error')).toBeFalsy();
    // KaTeX embeds the raw source inside an invisible <annotation> (inside
    // .katex-mathml) for accessibility/copy-paste — strip that before
    // asserting no raw LaTeX/`$` leaked into the visibly rendered output.
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.katex-mathml').forEach((el) => el.remove());
    expect(clone.textContent).not.toContain('\\frac');
    expect(clone.textContent).not.toContain('$');
  });

  it('does not mangle plain units like m/s (no auto-fraction, no stray backslashes)', () => {
    const { container } = render(<MarkdownText text={'A ball moves at 20 m/s for 3 sec.'} />);
    expect(container.textContent).toContain('20 m/s for 3 sec');
  });

  it('does not corrupt markdown emphasis by rewriting * as \\times', () => {
    const { container } = render(<MarkdownText text={'This is **bold** text'} />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders \\mathrm and subscripted/superscripted LaTeX correctly', () => {
    const { container } = render(
      <MarkdownText text={'$\\left(g=10 \\mathrm{~m/s^2}\\right)$ and $H_1$'} />
    );
    const katexNodes = container.querySelectorAll('.katex');
    expect(katexNodes.length).toBe(2);
    container.querySelectorAll('.katex-error').forEach(() => {
      throw new Error('KaTeX failed to render a valid expression');
    });
  });

  it('renders a markdown table (marking scheme header) without raw pipe characters leaking', () => {
    const { container } = render(
      <MarkdownText text={'| Symbol | Marks |\n| :--- | :--- |\n| Correct | +4 |'} />
    );
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('returns null for empty text', () => {
    const { container } = render(<MarkdownText text={''} />);
    expect(container.innerHTML).toBe('');
  });
});
