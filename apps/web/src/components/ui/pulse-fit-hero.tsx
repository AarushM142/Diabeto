import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight, ShieldCheck } from "lucide-react";

export interface NavigationItem {
  label: string;
  hasDropdown?: boolean;
  onClick?: () => void;
}

export interface ProgramCard {
  image: string;
  category: string;
  title: string;
  onClick?: () => void;
}

export interface PulseFitHeroProps {
  logo?: string;
  navigation?: NavigationItem[];
  loginButton?: {
    label: string;
    onClick: () => void;
  };
  signupButton?: {
    label: string;
    onClick: () => void;
  };
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  disclaimer?: string;
  socialProof?: {
    avatars: string[];
    text: string;
  };
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

const SAFE_FALLBACK_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

export function PulseFitHero({
  logo = "diabeto.",
  navigation = [
    { label: "Senior Sanctuary" },
    { label: "Clinician EHR" },
    { label: "Coach Copilot" },
    { label: "Family Safety" },
  ],
  loginButton,
  signupButton,
  ctaButton,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  programs = [],
  className,
  children,
}: PulseFitHeroProps) {
  return (
    <section
      className={cn(
        "relative w-full min-h-screen flex flex-col overflow-hidden",
        className
      )}
      style={{
        background: "linear-gradient(180deg, #F9F8F4 0%, #F4F1EA 45%, #FFFFFF 100%)",
      }}
      role="banner"
      aria-label="Hero section"
    >
      {/* Paper Grain Texture Overlay */}
      <div className="paper-grain-overlay" aria-hidden="true" />

      {/* Top Header with Centered Max-Width Container */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-30 w-full"
        style={{
          borderBottom: "1px solid rgba(45, 58, 49, 0.08)",
          backgroundColor: "rgba(249, 248, 244, 0.85)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "18px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* Brand Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--accent-sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "1.2rem",
                fontFamily: "var(--font-serif)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              d.
            </div>
            <div>
              <span
                className="font-serif"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--text-forest)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  display: "block",
                }}
              >
                {logo}
              </span>
              <span
                style={{
                  fontSize: "0.66rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 700,
                  marginTop: "3px",
                  display: "block",
                }}
              >
                Senior Diabetes Platform
              </span>
            </div>
          </div>

          {/* Desktop Center Navigation Links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
            }}
            aria-label="Main navigation"
          >
            {navigation.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={item.onClick}
                className="hover:opacity-75 transition-opacity cursor-pointer bg-transparent border-none"
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--text-forest)",
                  padding: "6px 8px",
                  borderRadius: "8px",
                }}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action Buttons: Log In & Sign Up / Portals */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {loginButton && (
              <button
                type="button"
                onClick={loginButton.onClick}
                className="transition-all hover:bg-black/5 cursor-pointer"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-stone)",
                  borderRadius: "20px",
                  padding: "8px 18px",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  color: "var(--text-forest)",
                }}
              >
                {loginButton.label}
              </button>
            )}

            {(signupButton || ctaButton) && (
              <button
                type="button"
                onClick={(signupButton || ctaButton)!.onClick}
                className="transition-all hover:scale-105 cursor-pointer"
                style={{
                  background: "var(--text-forest)",
                  border: "none",
                  borderRadius: "20px",
                  padding: "9px 20px",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  boxShadow: "var(--shadow-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ShieldCheck size={14} color="#A7F3D0" />
                <span>{(signupButton || ctaButton)!.label}</span>
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Hero Body */}
      {children ? (
        <div className="relative z-10 flex-1 flex items-center justify-center w-full">
          {children}
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 md:pt-24 pb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col items-center text-center max-w-4xl"
            style={{ gap: "28px" }}
          >
            {/* Title with Serif Editorial Typography */}
            <h1
              className="font-serif"
              style={{
                fontWeight: 700,
                fontSize: "clamp(2.3rem, 5vw, 3.8rem)",
                lineHeight: "1.16",
                color: "var(--text-forest)",
                letterSpacing: "-0.025em",
                margin: 0,
                maxWidth: "880px",
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: "clamp(0.98rem, 1.8vw, 1.15rem)",
                lineHeight: "1.65",
                color: "var(--text-muted)",
                maxWidth: "700px",
                margin: 0,
              }}
            >
              {subtitle}
            </p>

            {/* Action Buttons */}
            {(primaryAction || secondaryAction) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 mt-3"
              >
                {primaryAction && (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    className="transition-all hover:scale-105 cursor-pointer"
                    style={{
                      background: "var(--text-forest)",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      padding: "14px 30px",
                      borderRadius: "30px",
                      border: "none",
                      boxShadow: "var(--shadow-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{primaryAction.label}</span>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </button>
                )}

                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    className="transition-all hover:scale-105 cursor-pointer"
                    style={{
                      background: "var(--surface-white)",
                      border: "1px solid var(--border-stone)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "var(--text-forest)",
                      padding: "14px 26px",
                      borderRadius: "30px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </motion.div>
            )}

            {/* Disclaimer */}
            {disclaimer && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: "var(--text-dim)",
                  fontStyle: "italic",
                  margin: 0,
                  marginTop: "4px",
                }}
              >
                {disclaimer}
              </motion.p>
            )}

            {/* Social Proof with Guaranteed Image Fallback */}
            {socialProof && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="flex flex-row items-center justify-center gap-3 pt-3"
              >
                <div className="flex flex-row -space-x-2">
                  {socialProof.avatars.map((avatar, index) => (
                    <img
                      key={index}
                      src={avatar}
                      alt={`Clinician / Caregiver ${index + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = SAFE_FALLBACK_AVATAR;
                      }}
                      className="rounded-full border-2 border-white"
                      style={{
                        width: "38px",
                        height: "38px",
                        objectFit: "cover",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-forest)",
                  }}
                >
                  {socialProof.text}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Program Cards Carousel */}
      {programs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="relative z-10 w-full overflow-hidden"
          style={{
            paddingTop: "48px",
            paddingBottom: "56px",
          }}
        >
          {/* Gradient Overlays */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: "120px",
              background: "linear-gradient(90deg, #F9F8F4 0%, rgba(249, 248, 244, 0) 100%)",
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
            style={{
              width: "120px",
              background: "linear-gradient(270deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)",
            }}
          />

          {/* Scrolling Container */}
          <motion.div
            className="flex items-center"
            animate={{
              x: [0, -((programs.length * 360) / 2)],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: programs.length * 4.5,
                ease: "linear",
              },
            }}
            style={{
              gap: "20px",
              paddingLeft: "24px",
            }}
          >
            {/* Duplicate programs for seamless loop */}
            {[...programs, ...programs].map((program, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03, y: -6 }}
                transition={{ duration: 0.25 }}
                onClick={program.onClick}
                className="flex-shrink-0 cursor-pointer relative overflow-hidden"
                style={{
                  width: "340px",
                  height: "440px",
                  borderRadius: "22px",
                  boxShadow: "0 10px 28px rgba(45, 58, 49, 0.14)",
                  backgroundColor: "var(--surface-white)",
                }}
              >
                {/* Image */}
                <img
                  src={program.image}
                  alt={program.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80";
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Botanical Dark Gradient Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(0, 0, 0, 0.05) 20%, rgba(45, 58, 49, 0.95) 100%)",
                  }}
                />

                {/* Text Content */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-6"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "#A7F3D0",
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(6px)",
                      padding: "3px 10px",
                      borderRadius: "8px",
                      alignSelf: "flex-start",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    {program.category}
                  </span>
                  <h3
                    className="font-serif"
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: "1.35",
                      margin: 0,
                    }}
                  >
                    {program.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
