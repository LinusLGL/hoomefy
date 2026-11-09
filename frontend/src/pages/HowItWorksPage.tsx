import { Upload, Palette, Sparkles, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { Button } from '@/components/ui/button';

export default function HowItWorksPage() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload Your Room Photo',
      description:
        'Take a clear photo of any room in your home or upload an existing one. Our AI works best with well-lit, uncluttered photos.',
      details: [
        'Supports JPEG, PNG, and WebP formats',
        'Up to 10MB file size',
        'Works with photos from your phone or camera',
      ],
    },
    {
      icon: Palette,
      title: 'Choose Your Design Style',
      description:
        'Select from 10 professionally curated interior design styles. From Modern Minimalist to Gothic Romantic, find the perfect look for your space.',
      details: [
        'Modern, Traditional, and Contemporary styles',
        'Customize color palettes and intensity',
        'Add custom design instructions',
      ],
    },
    {
      icon: Sparkles,
      title: 'AI Transforms Your Room',
      description:
        'Our advanced AI powered by Amazon Bedrock generates a professional redesign of your room while preserving its architecture and layout.',
      details: [
        'Maintains room dimensions and structure',
        'Changes furniture, colors, and decor',
        'Completes in under 60 seconds',
      ],
    },
    {
      icon: Download,
      title: 'Save & Download Your Design',
      description:
        'Compare before and after with our interactive tools. Save to your personal gallery and download high-resolution images.',
      details: [
        'Interactive slider comparison',
        'Side-by-side view',
        'Download original and redesigned images',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-800 to-navy-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ivory font-heading mb-6">
            How Hoomefy Works
          </h1>
          <p className="text-xl text-ivory/70 max-w-2xl mx-auto">
            Transform any room in four simple steps. No design experience required.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="flex flex-col md:flex-row gap-8 mb-20 last:mb-0 items-start"
              >
                {/* Icon and Step Number */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-amber-600/20 border-2 border-amber-600 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-accent" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-600 text-on-accent flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-ivory font-heading mb-4">
                    {step.title}
                  </h2>
                  <p className="text-lg text-ivory/70 mb-6">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-ivory/75">
                        <svg
                          className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900 to-navy-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-ivory font-heading mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-ivory/70 mb-8">
            Start your free design transformation today
          </p>
          <Link to={ROUTES.studio}>
            <Button size="lg" className="text-lg px-8 py-4">
              Start Designing Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
