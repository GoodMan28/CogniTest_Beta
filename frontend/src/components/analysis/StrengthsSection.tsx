import type { ReportAnalysis } from '../../types/reportAnalysis';
import SectionCard from './SectionCard';
import RadarChart from './RadarChart';
import { getCategory, SUBJECT_CATEGORIES } from '../../utils/radarUtils';

interface Props {
  analysis: ReportAnalysis;
}

/**
 * "Strength and Improvement Areas" — rule-based prose strengths/improvements
 * plus ranked strong/weak chapter lists per subject. Matches PDF Sections 10–13.
 */
const StrengthsSection = ({ analysis }: Props) => {
  const { strengths, improvements, strongChapters, weakChapters } = analysis.insights;

  const nothing = strengths.length === 0 && improvements.length === 0 && strongChapters.length === 0 && weakChapters.length === 0;

  return (
    <SectionCard icon="explore" iconColor="text-gray-700" title="Strength and Improvement Areas">
      {nothing && (
        <p className="text-sm text-gray-400">Not enough attempted questions to generate insights yet.</p>
      )}

      {/* Subject Radar Charts */}
      {Object.keys(analysis.chapters).length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-blue-600 mr-2">radar</span> Topic Accuracy Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(analysis.chapters).map(([subject, chapters]) => {
              const categories = SUBJECT_CATEGORIES[subject] || [];
              if (categories.length === 0) return null;

              const categoryAccuracies = categories.map(cat => {
                const matchingChapters = chapters.filter(ch => getCategory(ch.label, subject) === cat);
                if (matchingChapters.length === 0) {
                  return { category: cat, accuracy: 50, count: 0 };
                }

                let sumCorrect = 0;
                let sumTotal = 0;
                for (const ch of matchingChapters) {
                  sumCorrect += ch.correct;
                  sumTotal += ch.attempted;
                }

                const accuracy = sumTotal > 0 ? Math.round((sumCorrect / sumTotal) * 100) : 50;
                return { category: cat, accuracy, count: sumTotal };
              });

              const theme = { text: 'fill-gray-700', stroke: '#4b5563' }; // Fallback theme

              return (
                <div key={subject} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col relative shadow-sm">
                  <h5 className="text-xs font-black tracking-widest text-center text-gray-500 uppercase mb-4">{subject}</h5>
                  <div className="flex-1 w-full flex items-center justify-center">
                    <RadarChart
                      categoryAccuracies={categoryAccuracies}
                      subject={subject}
                      theme={theme}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-green-600 mr-2">rocket_launch</span> Your Strengths
          </h4>
          <div className="space-y-3">
            {strengths.map((text, i) => (
              <div key={i} className="bg-white border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-green-600 text-[18px] flex-shrink-0 mt-0.5">check_box</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {improvements.length > 0 && (
        <div className="mb-8">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-amber-600">track_changes</span> Areas to Improve
          </h4>
          <div className="space-y-3">
            {improvements.map((text, i) => (
              <div key={i} className="bg-white border border-amber-200 rounded-lg px-4 py-3 text-sm text-gray-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-500 text-[18px] flex-shrink-0 mt-0.5">psychology</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}


    </SectionCard>
  );
};

export default StrengthsSection;
