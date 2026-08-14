import React, { memo, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import SEO from '../../components/SEO';
import BackButton from '../../components/BackButton';
import useSiteContent from '../../hooks/useSiteContent';
import '../PrivacyPolicy/ContentPages.css';

const FALLBACK = {
  faqs: {
    pageTitle: 'Frequently Asked Questions',
    subtitle: 'Quick answers about MSP Tech Club at MIU.',
    items: []
  }
};

const FaqItem = memo(({ item, open, onToggle }) => {
  const panelId = `faq-panel-${item.id}`;
  const buttonId = `faq-button-${item.id}`;

  return (
    <article className={`FaqItem${open ? ' FaqItem--open' : ''}`}>
      <h2 className="FaqItem__heading">
        <button
          type="button"
          id={buttonId}
          className="FaqItem__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="FaqItem__question">{item.question}</span>
          <FiChevronDown className="FaqItem__chevron" aria-hidden="true" />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            className="FaqItem__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="FaqItem__answer">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

FaqItem.displayName = 'FaqItem';

const FAQs = memo(() => {
  const { data, loading } = useSiteContent(['faqs'], FALLBACK);
  const faqs = data.faqs || FALLBACK.faqs;
  const items = useMemo(
    () =>
      (Array.isArray(faqs.items) ? faqs.items : [])
        .filter((item) => item && (item.question || item.answer))
        .map((item, index) => ({
          ...item,
          id: String(item.id || `faq-${index}`)
        })),
    [faqs.items]
  );

  const [openId, setOpenId] = useState(null);

  const toggle = useCallback((id) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    }),
    [items]
  );

  return (
    <main className="ContentPage">
      <SEO
        title="FAQs"
        description={
          faqs.subtitle ||
          'Frequently asked questions about MSP Tech Club at Misr International University.'
        }
        keywords="MSP FAQ, MIU tech club questions, MSP membership, MSP events"
        url="https://msp-miu.tech/faqs"
        structuredData={structuredData}
      />
      <BackButton to="/" label="Back to Home" />

      <section className="ContentPage__hero" aria-labelledby="faqs-heading">
        <div className="ContentPage__heroBg" aria-hidden="true" />
        <div className="ContentPage__heroInner">
          <h1 id="faqs-heading" className="ContentPage__title">
            {faqs.pageTitle || 'Frequently Asked Questions'}
          </h1>
          {faqs.subtitle && <p className="ContentPage__subtitle">{faqs.subtitle}</p>}
        </div>
      </section>

      <section className="ContentPage__body" aria-label="Frequently asked questions">
        {loading && !items.length ? (
          <p className="ContentPage__loading">Loading…</p>
        ) : items.length === 0 ? (
          <p className="ContentPage__empty">No FAQs published yet. Check back soon.</p>
        ) : (
          <div className="FaqList">
            {items.map((item) => (
              <FaqItem
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        )}

        <p className="ContentPage__footnote">
          Looking for how we handle your data? Read our{' '}
          <Link to="/privacy" className="ContentPage__link">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
});

FAQs.displayName = 'FAQs';

export default FAQs;
