import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';
import BackButton from '../../components/BackButton';
import useSiteContent from '../../hooks/useSiteContent';
import './ContentPages.css';

const FALLBACK = {
  privacy_policy: {
    pageTitle: 'Privacy Policy',
    subtitle:
      'How MSP Tech Club at Misr International University collects, uses, and protects your information.',
    lastUpdated: '2026-08-14',
    intro:
      'This Privacy Policy explains how MSP Tech Club — MIU handles personal information when you use our website, Android app, and related services.',
    sections: []
  }
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const PrivacyPolicy = memo(() => {
  const { data, loading } = useSiteContent(['privacy_policy'], FALLBACK);
  const policy = data.privacy_policy || FALLBACK.privacy_policy;
  const sections = Array.isArray(policy.sections) ? policy.sections : [];
  const lastUpdatedLabel = formatDate(policy.lastUpdated);

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: policy.pageTitle || 'Privacy Policy',
      description: policy.subtitle,
      dateModified: policy.lastUpdated || undefined,
      isPartOf: {
        '@type': 'WebSite',
        name: 'MSP Tech Club — MIU',
        url: 'https://msp-miu.tech'
      }
    }),
    [policy.pageTitle, policy.subtitle, policy.lastUpdated]
  );

  return (
    <main className="ContentPage">
      <SEO
        title="Privacy Policy"
        description={
          policy.subtitle ||
          'Privacy Policy for MSP Tech Club at Misr International University — how we collect, use, and protect your information.'
        }
        keywords="MSP privacy policy, MIU tech club privacy, data protection, MSP Tech Club"
        url="https://msp-miu.tech/privacy"
        structuredData={structuredData}
      />
      <BackButton to="/" label="Back to Home" />

      <section className="ContentPage__hero" aria-labelledby="privacy-heading">
        <div className="ContentPage__heroBg" aria-hidden="true" />
        <div className="ContentPage__heroInner">
          <h1 id="privacy-heading" className="ContentPage__title">
            {policy.pageTitle || 'Privacy Policy'}
          </h1>
          {policy.subtitle && <p className="ContentPage__subtitle">{policy.subtitle}</p>}
          {lastUpdatedLabel && (
            <p className="ContentPage__meta">Last updated: {lastUpdatedLabel}</p>
          )}
        </div>
      </section>

      <section className="ContentPage__body" aria-label="Privacy policy content">
        {loading && !sections.length && !policy.intro ? (
          <p className="ContentPage__loading">Loading…</p>
        ) : (
          <div className="ContentPage__prose">
            {policy.intro && (
              <motion.p
                className="ContentPage__intro"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {policy.intro}
              </motion.p>
            )}
            {sections.map((section, index) => (
              <motion.article
                key={`${section.heading || 'section'}-${index}`}
                className="ContentPage__section"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
              >
                {section.heading && (
                  <h2 className="ContentPage__sectionTitle">{section.heading}</h2>
                )}
                {section.body && <p className="ContentPage__sectionBody">{section.body}</p>}
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';

export default PrivacyPolicy;
