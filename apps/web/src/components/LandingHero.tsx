import React from 'react';
import { PulseFitHero } from './ui/pulse-fit-hero';
import type { UserRole } from '../api/client';

interface LandingHeroProps {
  onOpenLogin: (preferredRole?: UserRole) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenLogin }) => {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <PulseFitHero
        logo="diabeto."
        navigation={[
          { label: 'Senior Sanctuary', onClick: () => onOpenLogin('patient') },
          { label: 'Clinician EHR', onClick: () => onOpenLogin('clinician') },
          { label: 'Coach Copilot', onClick: () => onOpenLogin('coach') },
          { label: 'Family Safety', onClick: () => onOpenLogin('caregiver') },
          { label: 'Admin Desk', onClick: () => onOpenLogin('admin') },
        ]}
        ctaButton={{
          label: 'Sign In / Portals',
          onClick: () => onOpenLogin(),
        }}
        title="Personalized Senior Diabetes Care. Anywhere. Anytime."
        subtitle="AI-guided glycemic safety, proactive risk escalation, and multilingual WhatsApp companion designed for Indian seniors, endocrinologists, and family caregivers."
        primaryAction={{
          label: 'Launch Care Portal',
          onClick: () => onOpenLogin(),
        }}
        secondaryAction={{
          label: 'Quick Verified Roles',
          onClick: () => onOpenLogin(),
        }}
        disclaimer="*Verified by endocrinologists • ABDM & HIPAA consent compliant • Pune Central Clinic"
        socialProof={{
          avatars: [
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
          ],
          text: 'Active across Pune & Maharashtra Clinics • 99.4% Glycemic Safety Accuracy',
        }}
        programs={[
          {
            image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80',
            category: 'SENIOR PATIENT',
            title: '19px High-Contrast Sanctuary with Multilingual Voice Logging & 1-Tap SOS',
            onClick: () => onOpenLogin('patient'),
          },
          {
            image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
            category: 'DOCTOR / ENDOCRINOLOGIST',
            title: 'Continuous Glycemic TIR/TAR/TBR Analytics & Summary Verifications',
            onClick: () => onOpenLogin('clinician'),
          },
          {
            image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
            category: 'HEALTH COACH',
            title: 'WhatsApp Nudge Approval Queue, Dietary & Lifestyle Interventions',
            onClick: () => onOpenLogin('coach'),
          },
          {
            image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&auto=format&fit=crop&q=80',
            category: 'FAMILY CAREGIVER',
            title: 'Real-Time Peace-of-Mind Escalations, Meal Tracking & Consent Controls',
            onClick: () => onOpenLogin('caregiver'),
          },
          {
            image: 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=600&auto=format&fit=crop&q=80',
            category: 'INTELLIGENT SIMULATOR',
            title: 'Interactive Multilingual WhatsApp Conversational Engine Simulator',
            onClick: () => onOpenLogin('clinician'),
          },
        ]}
      />
    </div>
  );
};
