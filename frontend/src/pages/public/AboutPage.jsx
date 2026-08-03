import React from 'react';
import { Sparkles, MapPin, ShieldCheck, Zap, ArrowRight, Users, Globe2, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container, Section, Heading, Text, Button, Card, Badge } from '../../components/ui';

export default function AboutPage() {
  const navigate = useNavigate();

  const STATS = [
    { label: 'Places Indexed', value: '10M+' },
    { label: 'Avg Query Latency', value: '<200ms' },
    { label: 'Platform Uptime', value: '99.9%' },
    { label: 'Global Cities', value: '1,200+' },
  ];

  const PILLARS = [
    {
      icon: Sparkles,
      title: 'Natural Language Discovery',
      description: 'Replace rigid category dropdowns with conversational spatial intent. Search the way you describe places to a friend.',
    },
    {
      icon: Cpu,
      title: 'Google Gemini AI Integration',
      description: 'Leverage state-of-the-art multimodal reasoning models to rank locations by vibe, amenities, crowd levels, and spatial distance.',
    },
    {
      icon: ShieldCheck,
      title: 'Privacy-First Geolocation',
      description: 'Your location data stays ephemeral. We compute spatial proximity in memory without selling query trails to data brokers.',
    },
    {
      icon: Zap,
      title: 'Sub-Second Caching Architecture',
      description: 'Built on a high-throughput Redis vector cache and PostgreSQL pipeline for instant results across web and mobile viewports.',
    },
  ];

  return (
    <div className="bg-white font-sans text-slate-900">
      {/* Hero Section */}
      <Section className="bg-gradient-to-b from-blue-50/60 via-white to-white border-b border-slate-100 py-16 md:py-24">
        <Container size="5xl" className="text-center space-y-6">
          <Badge variant="blue" className="mx-auto">About Nearby Locator</Badge>
          <Heading level={1} className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Redefining Location Discovery Through <span className="text-blue-600">Spatial Intelligence</span>
          </Heading>
          <Text size="lg" className="max-w-2xl mx-auto text-slate-600 leading-relaxed">
            Nearby Locator bridges the gap between natural human conversation and local place data. Powered by Google Gemini AI, we help you uncover incredible places around you effortlessly.
          </Text>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
              Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/contact')}>
              Contact Team
            </Button>
          </div>
        </Container>
      </Section>

      {/* Stats Counter Section */}
      <Section className="py-12 bg-slate-900 text-white">
        <Container size="6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-3xl md:text-4xl font-extrabold font-heading text-blue-400">{stat.value}</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Product Pillars Grid */}
      <Section className="py-16 md:py-20 bg-slate-50/60">
        <Container size="6xl" className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Heading level={2} className="text-3xl font-bold">Why We Built Nearby Locator</Heading>
            <Text className="text-slate-600">Traditional map applications rely on rigid tags and sponsored ads. We designed a pure spatial intelligence platform focused on natural context.</Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <Card key={idx} className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Heading level={3} className="text-lg font-bold">{pillar.title}</Heading>
                  <Text size="sm" className="text-slate-600 leading-relaxed">{pillar.description}</Text>
                </Card>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* Vision Callout Banner */}
      <Section className="py-16 bg-white">
        <Container size="5xl" className="text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Globe2 className="w-6 h-6" />
          </div>
          <Heading level={2} className="text-3xl font-bold">Our Global Mission</Heading>
          <Text className="max-w-2xl mx-auto text-slate-600 leading-relaxed">
            Whether you are discovering local hidden gems in your hometown or exploring a new city abroad, Nearby Locator provides contextual recommendations tailored to your exact taste.
          </Text>
          <Button variant="primary" onClick={() => navigate('/discover')} className="mt-2">
            Try Spatial Search Now
          </Button>
        </Container>
      </Section>
    </div>
  );
}
