import type { ReportAnalysis } from '../../types/reportAnalysis';
import { STATUS_COLORS } from '../../types/reportAnalysis';
import DonutChart from '../charts/DonutChart';
import SectionCard, { fmtPct } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
}

/** "Scoreboard: Where You Stand Right Now" — marks, accuracy, attempt %, C/I/U and distribution donut. */
const ScoreboardSection = ({ analysis }: Props) => {
  const { summary } = analysis;

  const metrics = [
    { icon: 'emoji_events', label: 'Marks Scored', value: <>{summary.score}<span className="text-base text-gray-400 font-bold">/{summary.maxMarks}</span></>, tone: 'text-amber-600' },
    { icon: 'quiz', label: 'Questions', value: <>{summary.attempted}<span className="text-base text-gray-400 font-bold">/{summary.questionCount}</span></>, tone: 'text-gray-900', sub: 'attempted' },
    { icon: 'target', label: 'Accuracy', value: fmtPct(summary.accuracyPct), tone: 'text-blue-600', sub: 'of attempted correct' },
    { icon: 'percent', label: 'Attempt', value: fmtPct(summary.attemptPct), tone: 'text-green-600', sub: 'of paper attempted' },
  ];

  const cards = [
    { label: 'Questions Correct', value: summary.correct, icon: 'check_circle', color: 'text-green-600', border: 'border-green-300', bg: 'bg-green-50/40' },
    { label: 'Questions Incorrect', value: summary.incorrect, icon: 'cancel', color: 'text-red-500', border: 'border-red-300', bg: 'bg-red-50/40' },
    { label: 'Questions Unattempted', value: summary.skipped, icon: 'block', color: 'text-gray-400', border: 'border-gray-300', bg: 'bg-gray-50' },
  ];

  return (
    <SectionCard
      icon="military_tech" iconColor="text-amber-600"
      title="Scoreboard: Where You Stand Right Now"
      description="Here you can see your total marks and question-wise breakup. The accuracy and attempt ratio reveal how effectively you used the paper. Aim to increase both attempt and accuracy together — that's the real growth formula."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {metrics.map(m => (
          <div key={m.label} className="text-center py-3">
            <span className={`material-symbols-outlined text-[22px] ${m.tone}`}>{m.icon}</span>
            <div className="text-xs font-bold text-gray-700 mt-1">{m.label}</div>
            <div className={`text-2xl font-black mt-1 ${m.tone}`}>{m.value}</div>
            {m.sub && <div className="text-[10px] text-gray-400 font-medium">{m.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg border-2 ${c.border} ${c.bg} py-4 text-center`}>
            <span className={`material-symbols-outlined text-[22px] ${c.color}`}>{c.icon}</span>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-xs font-bold text-gray-700 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 md:w-48">
          <span className="material-symbols-outlined text-[20px] text-gray-500">donut_small</span>
          Question Distribution
        </div>
        <DonutChart
          size={170}
          strokeWidth={34}
          segments={[
            { value: summary.correct, color: STATUS_COLORS.correct, label: 'Correct' },
            { value: summary.incorrect, color: STATUS_COLORS.incorrect, label: 'Incorrect' },
            { value: summary.skipped, color: STATUS_COLORS.unanswered, label: 'Unattempted' },
          ]}
        />
        <div className="text-xs text-gray-500 font-medium md:max-w-xs leading-relaxed">
          <div><span className="font-bold text-green-700">+{summary.positiveMarks}</span> earned from correct answers</div>
          <div><span className="font-bold text-red-600">{summary.negativeMarks}</span> lost to negative marking</div>
          <div className="mt-1 text-gray-400">Net: <span className="font-bold text-gray-800">{summary.score}</span> / {summary.maxMarks}</div>
        </div>
      </div>
    </SectionCard>
  );
};

export default ScoreboardSection;
