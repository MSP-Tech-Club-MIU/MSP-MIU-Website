import React, { memo, useEffect, useMemo, useState } from 'react';
import SEO from '../components/SEO';
import './PageBase.css';
import BoardHeader from './Board/BoardHeader';
import ProfileCard from '../components/ProfileCard';
import DepartmentMenu from './Board/DepartmentMenu';
import BackButton from '../components/BackButton';
import PageLoader from '../components/PageLoader';
import SeasonBadge from '../components/SeasonBadge';
import SeasonSelector from '../components/SeasonSelector';
import ApiService from '../services/api';
import { useSeason } from '../context/SeasonContext';
import { departments as FALLBACK_DEPARTMENTS, getDepartmentNameById } from '../data/departments';
import './Board/Board.css';

import img5 from '../assets/Images/card.jpg';
import vpPhoto from '../assets/Images/VP H.png';
import PW from '../assets/Images/Mo-Wael President.png';
import Founder from '../assets/Images/Founder Photo.png';
import CoHeadM1 from '../assets/Images/Co Head Joseph.png';
import HeadHR from '../assets/Images/SalmaHR.png';
import CoHeadH1 from '../assets/Images/RawaaHR.png';
import CoHeadH2 from '../assets/Images/SherifHR.png';
import CoHeadPR2 from '../assets/Images/Yousef-AbdelaalPR.png';

/** Legacy fallback if the board API has no visible members yet. */
const FALLBACK_BOARD = [
  { id: 1, name: 'Mahmoud Mamdouh', role: 'Founder', department: 9, image: Founder },
  { id: 2, name: 'Mohamed Wael', role: 'President', department: 8, image: PW },
  { id: 3, name: 'Mohamed Hesham', role: 'Vice President', department: 7, image: vpPhoto },
  { id: 4, name: 'Ahmed Mostafa', role: 'Software Development Head', department: 1, image: img5 },
  { id: 5, name: 'Michael Hisham', role: 'Software Development Co-Head', department: 1 },
  { id: 6, name: 'Habiba Ehab', role: 'Software Development Co-Head', department: 1 },
  { id: 7, name: 'Mohammed Essam', role: 'Technical Training Head', department: 2 },
  { id: 8, name: 'Abdelkader', role: 'Technical Training Co-Head', department: 2 },
  { id: 9, name: 'Shahd Waleed', role: 'Technical Training Co-Head', department: 2 },
  { id: 10, name: 'Youssef Hussien', role: 'Technical Training Co-Head', department: 2 },
  { id: 11, name: 'Diaa', role: 'Media & Content Creation Head', department: 3 },
  { id: 12, name: 'Joseph George', role: 'Media & Content Creation Co-Head', department: 3, image: CoHeadM1 },
  { id: 13, name: 'Alaa Waleed', role: 'Media & Content Creation Co-Head', department: 3 },
  { id: 14, name: 'Yassin Emad', role: 'Media & Content Creation Co-Head', department: 3 },
  { id: 15, name: 'Malak Elghamrawy', role: 'Public Relations Head', department: 4 },
  { id: 16, name: 'Pola Raouf', role: 'Public Relations Co-Head', department: 4 },
  { id: 17, name: 'Youssef Abdelaal', role: 'Public Relations Co-Head', image: CoHeadPR2, department: 4 },
  { id: 18, name: 'Salma Khalid', role: 'Human Resources Head', image: HeadHR, department: 5 },
  { id: 19, name: 'Rawaa Ashour', role: 'Human Resources Co-Head', image: CoHeadH1, department: 5 },
  { id: 20, name: 'Mohamed Sherif', role: 'Human Resources Co-Head', image: CoHeadH2, department: 5 },
  { id: 21, name: 'Selim Mamdouh', role: 'Event Planning Head', department: 6 },
  { id: 22, name: 'Fatma Maged', role: 'Event Planning Co-Head', department: 6 },
  { id: 23, name: 'Habiba Aglan', role: 'Event Planning Co-Head', department: 6 },
];

const ROLE_ORDER = { Founder: 1, President: 2, 'Vice President': 3 };
const LEADERSHIP_NAMES = ['Founder', 'President', 'Vice President', 'Competitor'];

function findDeptId(depts, name, fallbackId) {
  const match = depts.find((d) => d.name === name);
  return match ? match.id : fallbackId;
}

function mapApiMember(row, leadershipIds) {
  const position = row.position || '';
  const deptName = row.department?.name || getDepartmentNameById(row.department_id);
  let role = position;
  if (position === 'Head' || position === 'Co-Head') {
    role = deptName && deptName !== 'Unknown Department' ? `${deptName} ${position}` : position;
  } else if (position === 'Vice President') {
    role = 'Vice President';
  }

  let department = row.department_id;
  if (position === 'Founder') department = leadershipIds.founder;
  else if (position === 'President') department = leadershipIds.president;
  else if (position === 'Vice President') department = leadershipIds.vicePresident;

  return {
    id: row.board_id,
    name: row.full_name,
    role,
    department,
    image: row.photo_url || undefined,
    linkedin: row.linkedin_url,
    github: row.github_url,
    email: row.email,
    sort_order: row.sort_order ?? 0,
    season: row.season || null,
    season_id: row.season_id ?? null,
  };
}

const Board = memo(() => {
  const { seasonFilters, isAll } = useSeason();
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);
  const [selectedDepartment, setSelectedDepartment] = useState(
    () => FALLBACK_DEPARTMENTS.find((d) => !LEADERSHIP_NAMES.includes(d.name))?.id ?? 1
  );
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const leadershipIds = useMemo(
    () => ({
      founder: findDeptId(departments, 'Founder', 9),
      president: findDeptId(departments, 'President', 8),
      vicePresident: findDeptId(departments, 'Vice President', 7),
    }),
    [departments]
  );

  const deptOrder = useMemo(
    () => ({
      [leadershipIds.founder]: 1,
      [leadershipIds.president]: 2,
      [leadershipIds.vicePresident]: 3,
    }),
    [leadershipIds]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await ApiService.getDepartments({ limit: 100, page: 1 });
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (!cancelled && rows.length) {
          const mapped = rows.map((d) => ({ id: d.department_id, name: d.name }));
          setDepartments(mapped);

          // Keep current selection if it still exists; otherwise pick first operational dept
          setSelectedDepartment((prev) => {
            if (mapped.some((d) => d.id === prev) || prev === 'president-vp') return prev;
            return mapped.find((d) => !LEADERSHIP_NAMES.includes(d.name))?.id ?? mapped[0]?.id ?? prev;
          });
        }
      } catch {
        /* keep fallback departments */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await ApiService.getBoard({ limit: 100, page: 1, ...seasonFilters });
        const rows = Array.isArray(result?.data) ? result.data : [];
        const mapped = rows.map((row) => mapApiMember(row, leadershipIds));
        if (!cancelled) {
          setBoardMembers(mapped.length > 0 ? mapped : FALLBACK_BOARD);
        }
      } catch {
        if (!cancelled) setBoardMembers(FALLBACK_BOARD);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seasonFilters, leadershipIds]);

  const groupedMembers = useMemo(() => {
    let members = boardMembers;
    if (selectedDepartment !== null) {
      if (selectedDepartment === 'president-vp') {
        members = boardMembers.filter(
          (m) =>
            m.department === leadershipIds.president ||
            m.department === leadershipIds.vicePresident
        );
      } else {
        members = boardMembers.filter((m) => m.department === selectedDepartment);
      }
    }

    const groups = {};
    members.forEach((member) => {
      const deptId = member.role.toLowerCase();
      if (!groups[deptId]) groups[deptId] = { heads: [], coHeads: [] };

      const role = member.role.toLowerCase();
      const isSpecial = ['founder', 'president', 'vice president'].includes(member.role.toLowerCase());
      const isHead = role.includes('head') && !role.includes('co-head');

      if (isHead || isSpecial) {
        groups[deptId].heads.push(member);
      } else {
        groups[deptId].coHeads.push(member);
      }
    });

    Object.values(groups).forEach((group) => {
      group.heads.sort((a, b) => (ROLE_ORDER[a.role] || 999) - (ROLE_ORDER[b.role] || 999));
    });

    return groups;
  }, [selectedDepartment, boardMembers, leadershipIds]);

  const sortedDepartments = Object.entries(groupedMembers).sort(([a], [b]) => {
    const orderA = deptOrder[a] || 999;
    const orderB = deptOrder[b] || 999;
    return orderA !== 999 && orderB !== 999
      ? orderA - orderB
      : orderA !== 999
        ? -1
        : orderB !== 999
          ? 1
          : parseInt(a, 10) - parseInt(b, 10);
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MSP Tech Club - MIU Board',
    description:
      'Meet the board members and leadership team of MSP Tech Club at MIU. Our dedicated team leads various departments including Software Development, Technical Training, Media & Content Creation, and more.',
    member: boardMembers.map((member) => ({
      '@type': 'Person',
      name: member.name,
      jobTitle: member.role,
    })),
  };

  return (
    <section className="PageBase">
      <SEO
        title="Meet the Board"
        description="Meet the board members and leadership team of MSP Tech Club at MIU. Learn about our dedicated team leading various departments including Software Development, Technical Training, Media & Content Creation, and more."
        keywords="MSP board members, MIU tech club leadership, student club board, MSP team, tech club leadership"
        url="https://msp-miu.tech/Meet-the-board"
        structuredData={structuredData}
      />
      <BackButton to="/" label="Back to Home" />
      <BoardHeader />
      <DepartmentMenu
        departments={departments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
      />
      <div className="BoardToolbar">
        <SeasonSelector />
      </div>
      {loading ? (
        <PageLoader />
      ) : (
        <section className="BoardMembers">
          <div key={selectedDepartment} className="BoardMembers__grid">
            {sortedDepartments.map(([deptId, group]) => (
              <div key={deptId} className="BoardMembers__department-group">
                {group.heads.map((member, index) => (
                  <div
                    key={member.id}
                    className="BoardMembers__card BoardMembers__card--head BoardMembers__card--animate"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {isAll && (member.season || member.season_id) && (
                      <div style={{ marginBottom: 8, textAlign: 'center' }}>
                        <SeasonBadge season={member.season} />
                      </div>
                    )}
                    <ProfileCard
                      avatarUrl={member.image}
                      name={member.name}
                      title={member.role}
                      showUserInfo={false}
                      behindGlowEnabled={false}
                      innerGradient="linear-gradient(135deg, rgba(142, 194, 240, 0.3), rgba(3, 169, 244, 0.2))"
                    />
                  </div>
                ))}
                {group.coHeads.length > 0 && (
                  <div className="BoardMembers__coheads-container">
                    {group.coHeads.map((member, index) => (
                      <div
                        key={member.id}
                        className="BoardMembers__card BoardMembers__card--cohead BoardMembers__card--animate"
                        style={{ animationDelay: `${(group.heads.length + index) * 0.1}s` }}
                      >
                        {isAll && (member.season || member.season_id) && (
                          <div style={{ marginBottom: 8, textAlign: 'center' }}>
                            <SeasonBadge season={member.season} />
                          </div>
                        )}
                        <ProfileCard
                          avatarUrl={member.image}
                          name={member.name}
                          title={member.role}
                          showUserInfo={false}
                          behindGlowEnabled={false}
                          innerGradient="linear-gradient(135deg, rgba(142, 194, 240, 0.3), rgba(3, 169, 244, 0.2))"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
});

Board.displayName = 'Board';

export default Board;
