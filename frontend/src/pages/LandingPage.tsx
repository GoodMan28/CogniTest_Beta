import TurquoiseGrid from '../components/landing/TurquoiseGrid';
import HeroSection from '../components/landing/HeroSection';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel';
import Footer from '../components/landing/Footer';

const LandingPage = () => (
  <div className="min-h-screen" style={{ color: 'white', background: '#020817' }}>
    <TurquoiseGrid />
    <HeroSection />
    <FeaturesGrid />
    <TestimonialsCarousel />
    <Footer />
  </div>
);

export default LandingPage;
