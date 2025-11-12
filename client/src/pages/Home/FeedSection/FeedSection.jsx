import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import './FeedSection.css';

const FeedSection = memo(() => {
  const announcements = useMemo(() => ([
    { id: 'a1', title: 'Welcome New Members', dept: 'Community', date: '2025-10-01', desc: 'Welcome to the MSP Tech Club. We are excited to have you on board. We hope you enjoy your time with us.', priority: true },
    { id: 'a2', title: 'MSP MIU Opening Session', dept: 'Events', date: '2025-10-22', desc: 'Join us for the grand opening ceremony of MSP Tech Club. We\'ll have guest speakers, networking opportunities, and exciting announcements about upcoming events and initiatives.', priority: false },
  ]), []);

  return (
    <section className="Feed" aria-labelledby="feed-heading">
      <div className="Feed__head"><h2 id="feed-heading" className="Feed__title">Announcements & Updates</h2></div>
      <div className="Feed__grid">
        {announcements.map(a => (
          <motion.article
            key={a.id}
            className={`FeedCard ${a.priority ? 'is-priority' : ''}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -8 }}
          >
            <div className="FeedCard__top">
              <span className="FeedCard__dept" data-dept={a.dept}>{a.dept}</span>
              <time className="FeedCard__date" dateTime={a.date}>{a.date}</time>
            </div>
            <h3 className="FeedCard__title">{a.title}</h3>
            <p className="FeedCard__desc">{a.desc}</p>
            {/* <motion.a href="/announcements" className="FeedCard__more" whileHover={{ color: '#fff', x: 3 }}>Read more →</motion.a> */}
          </motion.article>
        ))}
      </div>
    </section>
  );
});

FeedSection.displayName = 'FeedSection';

export default FeedSection;
