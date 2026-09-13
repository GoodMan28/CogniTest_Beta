import type { ReactNode } from 'react';

interface SectionCardProps {
  icon: string;
  iconColor?: string;
  title: string;
  description?: string;
  tips?: string[];
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}

/**
 * Card shell shared by every analysis section — PDF-style heading with an emoji,
 * a one-line explanation and optional 👉 coaching tips. Print-safe (avoids page
 * breaks inside the header block).
 */
const SectionCard = ({ icon, iconColor, title, description, tips, action, children, id }: SectionCardProps) => (
  <section id={id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none print:border-gray-300 print:break-inside-avoid">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 print:break-inside-avoid">
      <div className="min-w-0">
        <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
          <span className={`material-symbols-outlined text-[22px] leading-none ${iconColor || 'text-gray-700'}`}>{icon}</span>
          {title}
        </h3>
        {description && <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed">{description}</p>}
        {tips && tips.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {tips.map((t, i) => (
              <li key={i} className="text-xs text-gray-500 font-medium flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-gray-400 flex-shrink-0 mt-0.5">arrow_forward</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {action && <div className="flex-shrink-0 print:hidden">{action}</div>}
    </div>
    {children}
  </section>
);

export default SectionCard;

export const fmtPct = (v: number | null) => (v === null ? 'N/A' : `${v}%`);

export const pctTone = (v: number | null) =>
  v === null ? 'text-gray-400' : v >= 80 ? 'text-green-600' : v >= 50 ? 'text-amber-600' : 'text-red-600';

export const marksTone = (v: number) => (v < 0 ? 'text-red-600' : v > 0 ? 'text-gray-900' : 'text-gray-500');

export const thClass = 'px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider';
export const tdClass = 'px-4 py-3 text-sm';
