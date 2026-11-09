import { Sparkles, Heart, Code, Smile } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { useTagline } from '@/hooks/useTagline';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const haunted = useIsHaunted();
  const tagline = useTagline();
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-800 to-navy-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6 text-accent">
            <BrandMark iconOnly iconClassName="w-20 h-20" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ivory font-heading mb-6">
            About Hoomefy
          </h1>
          <p className="text-xl text-ivory/70 max-w-2xl mx-auto">
            {tagline}
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-invert prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-ivory font-heading mb-6">Our Story</h2>
            <div className="text-ivory/70 space-y-4 leading-relaxed">
              <p>
                Hoomefy was born from a simple question: What if interior design could be as
                magical as it is functional?
              </p>
              <p>
                {haunted
                  ? 'We combined cutting-edge AI technology with a darker sensibility to build an interior design platform that is professional, and a little haunted. Our mission is to make beautiful home design accessible to everyone, and memorable.'
                  : 'We combined cutting-edge AI technology with a refined design sensibility to build an interior design platform that is both professional and delightful. Our mission is to make beautiful home design accessible to everyone.'}
              </p>
              <p>
                {haunted ? 'Built for the Kiroween 2026 hackathon' : 'Built for a 2026 hackathon'}, Hoomefy showcases the power of AI-assisted
                development using Kiro IDE and AWS cloud services. Every line of code was written
                with care, guided by comprehensive specifications and steering files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-ivory font-heading mb-12 text-center">
            What We Believe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'AI for Everyone',
                description:
                  'Advanced technology should be accessible, intuitive, and delightful to use.',
              },
              {
                icon: Heart,
                title: 'Design Matters',
                description:
                  'Beautiful spaces improve our lives. Everyone deserves a home they love.',
              },
              {
                icon: Smile,
                title: 'Keep It Delightful',
                description:
                  'Professional doesn\'t have to mean boring. A little personality makes everything better.',
              },
              {
                icon: Code,
                title: 'Build Quality',
                description:
                  'Clean code, comprehensive testing, and thoughtful architecture matter.',
              },
            ].map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="bg-navy-900/50 border border-navy-700 rounded-xl p-6 hover:border-amber-600/40 transition-colors"
                >
                  <Icon className="w-10 h-10 text-accent mb-4" />
                  <h3 className="text-xl font-semibold text-ivory mb-3">{value.title}</h3>
                  <p className="text-ivory/70">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-ivory font-heading mb-6 text-center">
            Powered by Modern Technology
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-12">
            {[
              'React',
              'TypeScript',
              'AWS Lambda',
              'Amazon Bedrock',
              'DynamoDB',
              'S3',
              'Cognito',
              'Tailwind CSS',
              'Vite',
            ].map((tech) => (
              <div
                key={tech}
                className="bg-navy-800 border border-navy-700 rounded-lg p-4 text-center text-ivory/80 font-medium hover:border-amber-600/40 transition-colors"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hackathon Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-ivory font-heading mb-6">
            {haunted ? 'Built for Kiroween 2026' : 'Built for a 2026 hackathon'}
          </h2>
          <p className="text-lg text-ivory/70 max-w-2xl mx-auto mb-8">
            {haunted
              ? "Hoomefy was created as a submission for the Kiroween 2026 hackathon's Costume Contest category, showing how AI can transform an ordinary application into something else entirely."
              : 'Hoomefy was created as a hackathon submission, showcasing how AI can transform traditional applications with personality and charm.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button variant="secondary" size="lg">
                View on GitHub
              </Button>
            </a>
            <Link to={ROUTES.studio}>
              <Button size="lg">Try It Now</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mori only exists on the other side */}
      {haunted && (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-ivory font-heading mb-6">Mori</h2>
            <div className="flex justify-center mb-6 text-accent">
              <BrandMark iconOnly iconClassName="w-24 h-24" />
            </div>
            <p className="text-lg text-ivory/70 max-w-2xl mx-auto">
              Mori was here before the first design, and will be here after the last. Mori does not
              speak much, but Mori notices everything.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
