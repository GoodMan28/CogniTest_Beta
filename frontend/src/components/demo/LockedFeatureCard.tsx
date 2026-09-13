import { Lock } from 'lucide-react';

interface LockedFeatureCardProps {
  title: string;
  description: string;
}

const LockedFeatureCard = ({ title, description }: LockedFeatureCardProps) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
        <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center text-sm font-medium text-gray-600">
          <Lock className="w-4 h-4 mr-2" />
          Available in Pro
        </div>
      </div>
      
      <div className="opacity-40 filter blur-[2px]">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default LockedFeatureCard;
