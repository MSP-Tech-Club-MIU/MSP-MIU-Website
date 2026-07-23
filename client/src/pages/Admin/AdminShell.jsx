import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdClose, MdMenu, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import mspLogo from '../../assets/Images/msp-logo.png';
import SeasonSelector from '../../components/SeasonSelector';
import './AdminPanel.css';

const SIDEBAR_COLLAPSED_KEY = 'msp-admin-sidebar-collapsed';

/* Soft particle background — fewer particles, lower opacity for work screens */
const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const PARTICLE_COUNT = 48;
        const colors = [
            'rgba(74, 166, 255, 0.18)',
            'rgba(30, 198, 255, 0.14)',
            'rgba(13, 123, 216, 0.12)',
            'rgba(191, 224, 255, 0.08)',
        ];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.6 + 0.3,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.01 + 0.003,
                depth: Math.random(),
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.pulse += p.pulseSpeed;
                const sizeMod = Math.sin(p.pulse) * 0.5 + 0.5;
                const currentSize = p.size * (0.6 + sizeMod * 0.5);

                p.x += p.speedX * (0.5 + p.depth * 0.5);
                p.y += p.speedY * (0.5 + p.depth * 0.5);

                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.y > canvas.height + 10) p.y = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="AdminPanel__particleBg" />;
};

/**
 * Shared admin chrome: labeled sidebar, top bar, mobile drawer.
 * Desktop sidebar can expand/collapse; preference is persisted.
 */
const AdminShell = ({
    seo = null,
    navItems = [],
    bottomItems = [],
    activeKey,
    onNavClick,
    pageTitle,
    pageIcon = null,
    topRight = null,
    mobileMenuOpen,
    setMobileMenuOpen,
    children,
}) => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        document.body.classList.add('admin-panel-active');
        return () => {
            document.body.classList.remove('admin-panel-active');
        };
    }, []);

    const toggleSidebarCollapsed = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    const handleItemClick = (item) => {
        if (item.onClick) {
            item.onClick();
            setMobileMenuOpen?.(false);
            return;
        }
        onNavClick?.(item.key);
        setMobileMenuOpen?.(false);
    };

    const renderNavButton = (item, { bottom = false } = {}) => (
        <button
            key={item.key}
            type="button"
            className={`AdminPanel__navItem ${bottom ? 'AdminPanel__navItem--bottom' : ''} ${!bottom && activeKey === item.key ? 'active' : ''}`.trim()}
            onClick={() => handleItemClick(item)}
            aria-label={item.label}
            title={sidebarCollapsed ? item.label : undefined}
            aria-current={!bottom && activeKey === item.key ? 'page' : undefined}
        >
            <span className="AdminPanel__navIcon">{item.icon}</span>
            <span className="AdminPanel__navLabel">{item.label}</span>
            {sidebarCollapsed && (
                <span className="AdminPanel__navTooltip" aria-hidden="true">
                    {item.label}
                </span>
            )}
        </button>
    );

    return (
        <div className={`AdminPanel ${sidebarCollapsed ? 'AdminPanel--sidebarCollapsed' : ''}`}>
            {seo}
            <ParticleBackground />

            <div
                className={`AdminPanel__mobileOverlay ${mobileMenuOpen ? 'visible' : ''}`}
                onClick={() => setMobileMenuOpen?.(false)}
            />

            <aside
                className={`AdminPanel__sidebar ${mobileMenuOpen ? 'open' : ''} ${sidebarCollapsed ? 'AdminPanel__sidebar--collapsed' : ''}`}
            >
                <div className="AdminPanel__sidebarBrand">
                    <img
                        src={mspLogo}
                        alt="MSP Logo"
                        className="AdminPanel__sidebarLogo"
                        onClick={() => navigate('/')}
                    />
                    <span className="AdminPanel__sidebarBrandText">MSP Admin</span>
                </div>

                <button
                    type="button"
                    className="AdminPanel__sidebarCollapseBtn"
                    onClick={toggleSidebarCollapsed}
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
                </button>

                <nav className="AdminPanel__sidebarNav" aria-label="Admin navigation">
                    {navItems.map((item) => renderNavButton(item))}
                </nav>

                {bottomItems.length > 0 && (
                    <div className="AdminPanel__sidebarBottom">
                        {bottomItems.map((item) => renderNavButton(item, { bottom: true }))}
                    </div>
                )}
            </aside>

            <main className="AdminPanel__main">
                <header className="AdminPanel__topBar">
                    <div className="AdminPanel__topLeft">
                        <h1 className="AdminPanel__pageTitle">
                            {pageIcon && (
                                <span className="AdminPanel__pageTitleIcon">{pageIcon}</span>
                            )}
                            {pageTitle}
                        </h1>
                    </div>
                    <div className="AdminPanel__topRight">
                        <SeasonSelector />
                        {topRight}
                    </div>
                </header>

                <div className="AdminPanel__content">{children}</div>
            </main>

            <button
                type="button"
                className="AdminPanel__mobileToggle"
                onClick={() => setMobileMenuOpen?.(!mobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <MdClose /> : <MdMenu />}
            </button>
        </div>
    );
};

export default AdminShell;
export { ParticleBackground };
