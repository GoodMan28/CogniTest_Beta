import type { ReportDetailDTO } from '../../types/demoAnalysis';

interface StrengthsAndImprovementsProps {
  report: ReportDetailDTO;
}

/**
 * "Strength and Improvement Areas" — generates rich prose insights
 * based on computed data, plus ranked strong/weak chapter lists per
 * subject. Matches PDF Sections 10–13.
 */
const StrengthsAndImprovements = ({ report }: StrengthsAndImprovementsProps) => {
  const { breakdowns, questions } = report;
  const subjectBreakdown = breakdowns.find(b => b.scope === 'subject');
  const chapterBreakdown = breakdowns.find(b => b.scope === 'chapter');
  const difficultyBreakdown = breakdowns.find(b => b.scope === 'difficulty');

  // Generate prose-style strength observations
  const generateStrengthProse = (): string[] => {
    const prose: string[] = [];

    // Check if any subject has perfect accuracy
    if (subjectBreakdown) {
      for (const bucket of subjectBreakdown.buckets) {
        if (bucket.accuracyPct !== null && parseFloat(bucket.accuracyPct) === 100) {
          prose.push(`You absolutely nailed ${bucket.label} — 100% accuracy with amazing speed and confidence. Truly rocked it! 🔥`);
        }
      }
    }

    // Overall accuracy balance
    if (subjectBreakdown && subjectBreakdown.buckets.length > 1) {
      const accValues = subjectBreakdown.buckets
        .filter(b => b.accuracyPct !== null)
        .map(b => `${b.label} ${b.accuracyPct}%`);
      if (accValues.length > 0) {
        prose.push(`Overall, your paper shows great balance and control: ${accValues.join(', ')} accuracy.`);
      }
    }

    // High coverage subjects
    if (subjectBreakdown) {
      for (const bucket of subjectBreakdown.buckets) {
        if (bucket.coveragePct !== null && parseFloat(bucket.coveragePct) >= 90) {
          // Find strong chapters for this subject
          const subjectChapters = chapterBreakdown?.buckets
            .filter(c => c.subject === bucket.label && c.correct > 0)
            .map(c => c.label)
            .slice(0, 3) || [];
          const chapText = subjectChapters.length > 0 ? ` — solid grip on ${subjectChapters.join(' and ')} chapters` : '';
          prose.push(`In ${bucket.label}, your coverage was excellent (${bucket.coveragePct}%)${chapText}.`);
        }
      }
    }

    // Easy questions performance
    if (difficultyBreakdown) {
      const easyBucket = difficultyBreakdown.buckets.find(b => b.label.toLowerCase() === 'easy');
      if (easyBucket && easyBucket.accuracyPct !== null && parseFloat(easyBucket.accuracyPct) >= 90 &&
          easyBucket.coveragePct !== null && parseFloat(easyBucket.coveragePct) >= 90) {
        prose.push('You picked the Easy questions perfectly — accuracy and attempts were both high, showing sharp question selection skills.');
      }
    }

    return prose;
  };

  // Generate prose-style improvement observations
  const generateImprovementProse = (): string[] => {
    const prose: string[] = [];

    // Low coverage subjects
    if (subjectBreakdown) {
      for (const bucket of subjectBreakdown.buckets) {
        if (bucket.coveragePct !== null && parseFloat(bucket.coveragePct) < 60) {
          const unattempted = bucket.skipped;
          const diffInfo = difficultyBreakdown?.buckets
            .filter(d => d.skipped > 0)
            .map(d => `${d.skipped} from ${d.label} level Qs`)
            .join(', ') || '';
          prose.push(
            `In ${bucket.label}, attempt coverage was just ${bucket.coveragePct}% — almost half the paper was left unattempted` +
            (unattempted > 0 ? ` (${unattempted} Un)` : '') +
            (diffInfo ? `, mainly ${diffInfo}` : '') +
            '. Try to push your attempt % up in the next paper.'
          );
        }
      }
    }

    // Subjects where incorrect took longer (proxy: high incorrect relative to attempted)
    if (subjectBreakdown) {
      for (const bucket of subjectBreakdown.buckets) {
        if (bucket.incorrect > 0 && bucket.attempted > 0) {
          const incorrectRatio = bucket.incorrect / bucket.attempted;
          if (incorrectRatio > 0.2) {
            prose.push(
              `In ${bucket.label}, some answers were incorrect, showing possible overthinking or late changes. Review what exactly caused those errors — calculation slips, confusion, or rushing near the end.`
            );
          }
        }
      }
    }

    // Numerical section performance
    const numQuestions = questions.filter(q => q.questionType === 'numerical');
    if (numQuestions.length > 0) {
      const numCorrect = numQuestions.filter(q => q.status === 'correct').length;
      const numAccuracy = numQuestions.length > 0 ? (numCorrect / numQuestions.length) * 100 : 0;
      if (numAccuracy < 50) {
        prose.push('You scored less in the Numerical section. Need to work on that!');
      }
    }

    return prose;
  };

  // Compute strong/weak chapters per subject
  const getChaptersByStrength = (kind: 'strong' | 'weak') => {
    if (!chapterBreakdown) return {};

    const grouped: Record<string, Array<{ label: string; detail: string }>> = {};

    for (const bucket of chapterBreakdown.buckets) {
      const subject = bucket.subject || 'Other';
      const accuracy = bucket.accuracyPct !== null ? parseFloat(bucket.accuracyPct) : null;

      if (kind === 'strong' && accuracy !== null && accuracy >= 70 && bucket.correct >= 2) {
        if (!grouped[subject]) grouped[subject] = [];
        grouped[subject].push({
          label: bucket.label,
          detail: `${bucket.correct} C / ${bucket.incorrect} In / ${bucket.skipped} Un`,
        });
      } else if (kind === 'weak' && (
        (accuracy !== null && accuracy < 50) ||
        (bucket.skipped > bucket.correct)
      )) {
        if (!grouped[subject]) grouped[subject] = [];
        grouped[subject].push({
          label: bucket.label,
          detail: `${bucket.correct} C / ${bucket.incorrect} In / ${bucket.skipped} Un`,
        });
      }
    }

    return grouped;
  };

  const strengthProse = generateStrengthProse();
  const improvementProse = generateImprovementProse();
  const strongChapters = getChaptersByStrength('strong');
  const weakChapters = getChaptersByStrength('weak');

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Strength and Improvement Areas</h3>

      {/* Your Strengths */}
      {strengthProse.length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-lg">🚀</span> Your Strengths
          </h4>
          <div className="space-y-3">
            {strengthProse.map((text, i) => (
              <div key={i} className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-800 flex items-start gap-2">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Areas to Improve */}
      {improvementProse.length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-lg">🎯</span> Areas to Improve
          </h4>
          <div className="space-y-3">
            {improvementProse.map((text, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Strong Chapters */}
      {Object.keys(strongChapters).length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-lg">⭐</span> Your Strong Chapters
          </h4>
          <div className="space-y-3">
            {Object.entries(strongChapters).map(([subject, chapters], i) => (
              <div key={subject} className="bg-gray-50 rounded-lg px-4 py-3">
                <span className="text-sm font-bold text-gray-800">#{i + 1}</span>
                <span className="text-sm text-gray-700 ml-2">
                  {subject}: {chapters.map(c => `${c.label} (${c.detail})`).join(', ')}.
                  {' '}These areas show concept clarity, steady accuracy, and confidence in application.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Chapters to Improve */}
      {Object.keys(weakChapters).length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-lg">📖</span> Your Chapters to Improve
          </h4>
          <div className="space-y-3">
            {Object.entries(weakChapters).map(([subject, chapters]) => (
              <div key={subject} className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
                <span className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">⚡</span>
                  {subject}: {chapters.map(c => `${c.label} (${c.detail})`).join(', ')} — fix conceptual and practice issues.
                  Increasing attempt coverage here will convert current accuracy into much higher total marks.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrengthsAndImprovements;
