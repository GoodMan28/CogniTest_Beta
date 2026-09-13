import type { ReportAnalysis } from '../../types/reportAnalysis';
import { subjectColor } from '../../types/reportAnalysis';
import SectionCard, { fmtPct, pctTone, tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
}

const verdictFor = (acc: number | null, att: number | null) => {
  if (acc === null || att === null) return { text: 'Not enough attempts to judge', tone: 'text-gray-400' };
  if (att >= 75 && acc < 60) return { text: 'High hustle, low hit rate — slow down and aim better', tone: 'text-red-600' };
  if (acc >= 80 && att < 60) return { text: 'High hit rate, low hustle — playing too safe, push limits', tone: 'text-amber-600' };
  if (acc >= 80 && att >= 75) return { text: 'Great balance — keep it up', tone: 'text-green-600' };
  return { text: 'Room to grow on both fronts', tone: 'text-gray-500' };
};

/** "Hit Rate vs. Hustle Rate" — accuracy % vs attempt % per subject (PDF page 3). */
const HitRateSection = ({ analysis }: Props) => (
  <SectionCard
    icon="bolt" iconColor="text-amber-600"
    title="Hit Rate vs. Hustle Rate"
    description="Your Accuracy % shows how often you hit the target. Your Attempt % shows how brave you were to take a shot."
    tips={[
      'High hustle but low hit rate? Slow down and aim better.',
      "High hit rate but low hustle? You're playing too safe — time to push limits!",
    ]}
  >
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className={`${thClass} text-left`}>Subject</th>
            <th className={`${thClass} text-center`}>Accuracy %</th>
            <th className={`${thClass} text-center`}>Attempt %</th>
            <th className={`${thClass} text-left`}>Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {analysis.subjects.map((s, i) => {
            const v = verdictFor(s.accuracyPct, s.attemptPct);
            return (
              <tr key={s.key}>
                <td className={`${tdClass} font-bold`} style={{ color: subjectColor(s.label, i) }}>{s.label}</td>
                <td className={`${tdClass} text-center font-black ${pctTone(s.accuracyPct)}`}>
                  {fmtPct(s.accuracyPct)}
                  <div className="h-1.5 w-24 mx-auto mt-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full" style={{ width: `${s.accuracyPct ?? 0}%` }} />
                  </div>
                </td>
                <td className={`${tdClass} text-center font-black ${pctTone(s.attemptPct)}`}>
                  {fmtPct(s.attemptPct)}
                  <div className="h-1.5 w-24 mx-auto mt-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full" style={{ width: `${s.attemptPct ?? 0}%` }} />
                  </div>
                </td>
                <td className={`${tdClass} text-xs font-bold ${v.tone}`}>{v.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </SectionCard>
);

export default HitRateSection;
