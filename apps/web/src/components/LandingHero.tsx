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
        loginButton={{
          label: 'Log In',
          onClick: () => onOpenLogin(),
        }}
        signupButton={{
          label: 'Sign Up / Portals',
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
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
          ],
          text: 'Active across Pune & Maharashtra Clinics • 99.4% Glycemic Safety Accuracy',
        }}
        programs={[
          {
            image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
            category: 'SENIOR SANCTUARY',
            title: '19px High-Contrast Sanctuary with Hindi & Marathi Voice Logging & 1-Tap SOS',
            onClick: () => onOpenLogin('patient'),
          },
          {
            image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
            category: 'DOCTOR / CLINICIAN',
            title: 'Continuous Glycemic TIR/TAR/TBR Analytics, Prescriptions & Weekly Summary Sign-off',
            onClick: () => onOpenLogin('clinician'),
          },
          {
            image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
            category: 'HEALTH COACH',
            title: 'WhatsApp Nudge Approvals, Personalized Indian Nutrition & Behavioral Coaching',
            onClick: () => onOpenLogin('coach'),
          },
          {
            image: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=600&auto=format&fit=crop&q=80',
            category: 'FAMILY CAREGIVER',
            title: 'Real-Time Peace-of-Mind Escalations, Meal Status & Consent Transparency',
            onClick: () => onOpenLogin('caregiver'),
          },
          {
            image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600&auto=format&fit=crop&q=80',
            category: 'INTELLIGENT SIMULATOR',
            title: 'Multilingual Conversational WhatsApp Bot with Sarvam AI & Gemini Intelligence',
            onClick: () => onOpenLogin('clinician'),
          },
        ]}
      />
    </div>
  );
};
