import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGamepad,
  FaTrophy,
  FaVolumeUp,
  FaVolumeMute,
  FaPlay,
  FaPause,
  FaRedo,
  FaBolt,
  FaShieldAlt,
  FaCode,
  FaArrowUp,
  FaArrowDown,
  FaTrashAlt,
  FaMedal,
  FaFire,
  FaExpand,
  FaCompress,
  FaLayerGroup,
  FaMagnet,
  FaBug,
} from 'react-icons/fa';
import BackButton from '../../components/BackButton';
import SEO from '../../components/SEO';
import './CyberRunner.css';

const STORAGE_KEY = 'msp_cyber_runner_v1';
const LEVEL_STEP = 500;

const DEFAULT_STATS = {
  highScore: 0,
  highestLevel: 1,
  totalGames: 0,
  totalTokens: 0,
  bestStreak: 0,
  topRuns: [],
  muted: false,
};

// Core 6 Tech Stack Worlds + Procedural Endless Worlds for Level 7+
const CORE_THEMES = [
  {
    level: 1,
    name: 'Localhost Sandbox',
    subtitle: 'MSP Circuit Bus',
    hazardHint: 'Syntax Bugs & Packet Falcons in the sky',
    birdLabel: 'PKT_HAWK',
    bgStyle: 'circuit',
    primary: '#03A9F4',
    secondary: '#1ec6ff',
    surface: 'rgba(9, 26, 44, 0.78)',
    glow: 'rgba(3, 169, 244, 0.32)',
    skyTop: '#041122',
    skyMid: '#081f38',
    skyBot: '#0c2c4e',
    groundTop: '#09233e',
    groundBot: '#040f1d',
    obstacleColor: '#ff5b1f',
    birdColor: '#1ec6ff',
    birdWingColor: '#03A9F4',
  },
  {
    level: 2,
    name: 'Terminal Matrix',
    subtitle: 'Root Shell Mainframe',
    hazardHint: 'Glitch Hopper Bugs & Binary Crows',
    birdLabel: '0xCROW',
    bgStyle: 'matrix',
    primary: '#00e676',
    secondary: '#69f0ae',
    surface: 'rgba(5, 28, 16, 0.82)',
    glow: 'rgba(0, 230, 118, 0.32)',
    skyTop: '#021008',
    skyMid: '#041f11',
    skyBot: '#072e19',
    groundTop: '#062615',
    groundBot: '#021008',
    obstacleColor: '#00e676',
    birdColor: '#69f0ae',
    birdWingColor: '#00c853',
  },
  {
    level: 3,
    name: 'Azure Cloud Stratos',
    subtitle: 'High-Altitude Cluster',
    hazardHint: 'Wave-Gliding Cloud Birds & High Winds',
    birdLabel: 'SKY_GULL',
    bgStyle: 'clouds',
    primary: '#38bdf8',
    secondary: '#e0f2fe',
    surface: 'rgba(10, 34, 64, 0.82)',
    glow: 'rgba(56, 189, 248, 0.36)',
    skyTop: '#061a33',
    skyMid: '#0c2d54',
    skyBot: '#154578',
    groundTop: '#0e3157',
    groundBot: '#06182e',
    obstacleColor: '#f43f5e',
    birdColor: '#e0f2fe',
    birdWingColor: '#38bdf8',
  },
  {
    level: 4,
    name: 'AI Neural Core',
    subtitle: 'Deep Learning Synapse',
    hazardHint: 'Swooping Neural Ravens & Laser Gates',
    birdLabel: 'AI_RAVEN',
    bgStyle: 'neural',
    primary: '#d946ef',
    secondary: '#a855f7',
    surface: 'rgba(28, 11, 46, 0.82)',
    glow: 'rgba(217, 70, 239, 0.35)',
    skyTop: '#120520',
    skyMid: '#210b38',
    skyBot: '#321252',
    groundTop: '#240b3b',
    groundBot: '#10041c',
    obstacleColor: '#f43f5e',
    birdColor: '#f0abfc',
    birdWingColor: '#d946ef',
  },
  {
    level: 5,
    name: 'Firewall Inferno',
    subtitle: 'Overheated Security Core',
    hazardHint: 'Flaming Wyverns & Synchronized Double Waves',
    birdLabel: 'FIRE_HAWK',
    bgStyle: 'inferno',
    primary: '#ff5b1f',
    secondary: '#ffab00',
    surface: 'rgba(44, 14, 10, 0.84)',
    glow: 'rgba(255, 91, 31, 0.38)',
    skyTop: '#1a0505',
    skyMid: '#300a0a',
    skyBot: '#4a120b',
    groundTop: '#360c08',
    groundBot: '#170404',
    obstacleColor: '#ffab00',
    birdColor: '#ffab00',
    birdWingColor: '#ff5b1f',
  },
  {
    level: 6,
    name: 'Quantum Overdrive',
    subtitle: 'Qubit Hyper-Grid',
    hazardHint: 'Maximum Overclock & Quantum Raptors',
    birdLabel: 'Q_RAPTOR',
    bgStyle: 'quantum',
    primary: '#ffd54f',
    secondary: '#00e5ff',
    surface: 'rgba(22, 18, 46, 0.84)',
    glow: 'rgba(255, 213, 79, 0.38)',
    skyTop: '#0b071e',
    skyMid: '#181138',
    skyBot: '#261c52',
    groundTop: '#1d1440',
    groundBot: '#090617',
    obstacleColor: '#ff4081',
    birdColor: '#ffd54f',
    birdWingColor: '#00e5ff',
  },
];

const PROCEDURAL_NAMES = [
  'Synthwave Horizon',
  'Bio-Digital Helix',
  'Zero-Day Void',
  'Singularity Core',
  'Chrono Mainframe',
  'Hyperion Cyber-Mesh',
  'Starlight Kernel',
  'Plasma Supercluster',
];

const BG_STYLES = ['quantum', 'matrix', 'neural', 'clouds', 'inferno', 'circuit'];

function getLevelFromScore(score) {
  return Math.floor(Math.max(0, score) / LEVEL_STEP) + 1;
}

function getLevelTheme(level) {
  if (level <= CORE_THEMES.length) {
    return CORE_THEMES[level - 1];
  }
  const idx = level - 7;
  const hue = (idx * 55 + 190) % 360;
  const secHue = (hue + 48) % 360;
  const obsHue = (hue + 165) % 360;
  const name = PROCEDURAL_NAMES[idx % PROCEDURAL_NAMES.length];
  return {
    level,
    name: `${name} v${level - 5}.0`,
    subtitle: 'Procedural Overdrive Sector',
    hazardHint: 'Extreme Speed + Multi-Lane Sky Flocks',
    birdLabel: `CYBER_V${level}`,
    bgStyle: BG_STYLES[idx % BG_STYLES.length],
    primary: `hsl(${hue}, 92%, 58%)`,
    secondary: `hsl(${secHue}, 95%, 68%)`,
    surface: `hsla(${hue}, 48%, 12%, 0.84)`,
    glow: `hsla(${hue}, 90%, 55%, 0.36)`,
    skyTop: `hsl(${hue}, 55%, 7%)`,
    skyMid: `hsl(${hue}, 50%, 13%)`,
    skyBot: `hsl(${secHue}, 48%, 19%)`,
    groundTop: `hsl(${hue}, 52%, 14%)`,
    groundBot: `hsl(${hue}, 58%, 6%)`,
    obstacleColor: `hsl(${obsHue}, 92%, 60%)`,
    birdColor: `hsl(${secHue}, 95%, 70%)`,
    birdWingColor: `hsl(${hue}, 92%, 58%)`,
  };
}

const TECH_BADGES = [
  {
    id: 'hello_world',
    title: 'Hello World',
    threshold: 150,
    color: '#03A9F4',
    desc: 'Survive to 150+ points in Localhost Sandbox',
  },
  {
    id: 'matrix_operator',
    title: 'Matrix Operator',
    threshold: 500,
    color: '#00e676',
    desc: 'Reach 500+ points & enter Level 2: Terminal Matrix',
  },
  {
    id: 'cloud_strider',
    title: 'Azure Sky-Walker',
    threshold: 1000,
    color: '#38bdf8',
    desc: 'Reach 1,000+ points & enter Level 3: Cloud Stratos',
  },
  {
    id: 'neural_architect',
    title: 'Neural Net Architect',
    threshold: 1500,
    color: '#d946ef',
    desc: 'Reach 1,500+ points & enter Level 4: AI Neural Core',
  },
  {
    id: 'inferno_survivor',
    title: 'Firewall Breaker',
    threshold: 2000,
    color: '#ff5b1f',
    desc: 'Reach 2,000+ points & enter Level 5: Firewall Inferno',
  },
  {
    id: 'quantum_legend',
    title: 'Quantum 10x Legend',
    threshold: 2500,
    color: '#ffd54f',
    desc: 'Reach 2,500+ points & unlock Quantum Overdrive',
  },
];

// Logical Canvas Dimensions
const CANVAS_W = 1120;
const CANVAS_H = 500;
const GROUND_Y = 418;

// Balanced Player Bot Dimensions (~10-15% smaller than previous oversized version)
const PLAYER_X = 116;
const STAND_W = 50;
const STAND_H = 62;
const DUCK_W = 60;
const DUCK_H = 34;

// Fast horizontal speed + crisp jump physics
const START_SPEED = 9.5;
const GRAVITY = 0.84;
const FAST_FALL_GRAVITY = 2.65;
const JUMP_VY = -16.0;
const DOUBLE_JUMP_VY = -13.8;

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    const highScore = Number(parsed.highScore) || 0;
    return {
      highScore,
      highestLevel: Math.max(
        Number(parsed.highestLevel) || 1,
        getLevelFromScore(highScore)
      ),
      totalGames: Number(parsed.totalGames) || 0,
      totalTokens: Number(parsed.totalTokens) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      topRuns: Array.isArray(parsed.topRuns) ? parsed.topRuns.slice(0, 5) : [],
      muted: Boolean(parsed.muted),
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function saveStats(nextStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  } catch {
    // Ignore quota errors
  }
}

// Web Audio API Synthesizer
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.12, delay = 0) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors
    }
  }

  jump(muted) {
    if (muted) return;
    this.playTone(240, 520, 0.13, 'triangle', 0.13);
  }

  doubleJump(muted) {
    if (muted) return;
    this.playTone(360, 780, 0.15, 'sine', 0.13);
    this.playTone(540, 960, 0.12, 'triangle', 0.1, 0.04);
  }

  token(muted, combo = 1) {
    if (muted) return;
    const base = 540 + Math.min(combo, 5) * 45;
    this.playTone(base, base * 1.25, 0.08, 'sine', 0.12);
    this.playTone(base * 1.5, base * 1.75, 0.11, 'triangle', 0.1, 0.05);
  }

  powerup(muted) {
    if (muted) return;
    this.playTone(330, 440, 0.11, 'sine', 0.12);
    this.playTone(440, 660, 0.15, 'triangle', 0.12, 0.07);
    this.playTone(660, 880, 0.18, 'sine', 0.12, 0.14);
  }

  shieldBreak(muted) {
    if (muted) return;
    this.playTone(580, 180, 0.22, 'sawtooth', 0.13);
  }

  levelUp(muted) {
    if (muted) return;
    this.playTone(440, 440, 0.09, 'triangle', 0.13, 0);
    this.playTone(554.37, 554.37, 0.09, 'triangle', 0.13, 0.09);
    this.playTone(659.25, 659.25, 0.09, 'triangle', 0.13, 0.18);
    this.playTone(880, 1174.66, 0.28, 'triangle', 0.15, 0.27);
  }

  gameOver(muted) {
    if (muted) return;
    this.playTone(320, 180, 0.18, 'sawtooth', 0.13, 0);
    this.playTone(180, 85, 0.3, 'sawtooth', 0.14, 0.15);
  }
}

const sfx = new SoundFX();

export const CyberRunner = () => {
  const [stats, setStats] = useState(() => loadStats());
  const [gameState, setGameState] = useState('IDLE'); // IDLE | PLAYING | PAUSED | GAME_OVER
  const [theaterMode, setTheaterMode] = useState(false);
  const [levelBanner, setLevelBanner] = useState(null);
  const [hud, setHud] = useState({
    score: 0,
    level: 1,
    levelProgress: 0,
    tokens: 0,
    combo: 1,
    hasShield: false,
    magnetSec: 0,
    slowMoSec: 0,
    speedLevel: '1.0x',
    isNewRecord: false,
    crashReason: '',
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const canvasRef = useRef(null);
  const stageWrapRef = useRef(null);
  const rafRef = useRef(null);
  const bannerTimeoutRef = useRef(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const activeTheme = useMemo(() => getLevelTheme(hud.level), [hud.level]);

  const handleToggleTheater = useCallback(() => {
    setTheaterMode((prev) => {
      const next = !prev;
      setTimeout(() => {
        stageWrapRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 60);
      return next;
    });
  }, []);

  // Mutable engine state for 60fps loop
  const engineRef = useRef({
    status: 'IDLE',
    lastTime: 0,
    distance: 0,
    bonusScore: 0,
    score: 0,
    level: 1,
    tokens: 0,
    combo: 1,
    maxCombo: 1,
    baseSpeed: START_SPEED,
    speed: START_SPEED,
    groundOffset: 0,
    invincibleTimer: 0,
    warpFlash: 0,
    magnetTimer: 0,
    slowMoTimer: 0,
    crashReason: '',
    keys: {
      down: false,
    },
    player: {
      x: PLAYER_X,
      y: GROUND_Y - STAND_H,
      w: STAND_W,
      h: STAND_H,
      vy: 0,
      jumpsUsed: 0,
      ducking: false,
      hasShield: false,
      legFrame: 0,
    },
    obstacles: [],
    collectibles: [],
    particles: [],
    popups: [],
    bgNodes: Array.from({ length: 22 }, (_, i) => ({
      x: (i * CANVAS_W) / 22 + Math.random() * 45,
      y: 36 + Math.random() * (GROUND_Y - 70),
      vy: 1.4 + Math.random() * 2.0,
      size: 2.0 + Math.random() * 2.8,
      speedFactor: 0.2 + Math.random() * 0.38,
      char: ['0', '1', '</>', '0x', 'AI', '{}'][i % 6],
    })),
    nextObstacleGap: 330,
    lastHudSync: 0,
  });

  const triggerLevelBanner = useCallback((themeObj) => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setLevelBanner(themeObj);
    bannerTimeoutRef.current = setTimeout(() => {
      setLevelBanner(null);
    }, 3400);
  }, []);

  const spawnParticles = useCallback((x, y, color, count = 12, spread = 5.5) => {
    const eng = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.1 + Math.random() * spread;
      eng.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.3,
        life: 1,
        decay: 0.022 + Math.random() * 0.024,
        size: 2.6 + Math.random() * 3.5,
        color,
      });
    }
  }, []);

  const addPopup = useCallback((x, y, text, color = '#1ec6ff') => {
    engineRef.current.popups.push({
      x,
      y,
      text,
      color,
      life: 1,
    });
  }, []);

  const resetEngineForNewRun = useCallback(() => {
    const eng = engineRef.current;
    eng.status = 'PLAYING';
    eng.lastTime = performance.now();
    eng.distance = 0;
    eng.bonusScore = 0;
    eng.score = 0;
    eng.level = 1;
    eng.tokens = 0;
    eng.combo = 1;
    eng.maxCombo = 1;
    eng.baseSpeed = START_SPEED;
    eng.speed = START_SPEED;
    eng.invincibleTimer = 0;
    eng.warpFlash = 0;
    eng.magnetTimer = 0;
    eng.slowMoTimer = 0;
    eng.crashReason = '';
    eng.keys.down = false;
    eng.player = {
      x: PLAYER_X,
      y: GROUND_Y - STAND_H,
      w: STAND_W,
      h: STAND_H,
      vy: 0,
      jumpsUsed: 0,
      ducking: false,
      hasShield: false,
      legFrame: 0,
    };
    eng.obstacles = [];
    eng.collectibles = [];
    eng.particles = [];
    eng.popups = [];
    eng.nextObstacleGap = 320;
    eng.lastHudSync = 0;

    setLevelBanner(null);
    setHud({
      score: 0,
      level: 1,
      levelProgress: 0,
      tokens: 0,
      combo: 1,
      hasShield: false,
      magnetSec: 0,
      slowMoSec: 0,
      speedLevel: '1.0x',
      isNewRecord: false,
      crashReason: '',
    });
    setGameState('PLAYING');
  }, []);

  const triggerJump = useCallback(() => {
    const eng = engineRef.current;
    if (eng.status === 'IDLE' || eng.status === 'GAME_OVER') {
      resetEngineForNewRun();
      sfx.jump(statsRef.current.muted);
      return;
    }
    if (eng.status !== 'PLAYING') return;

    const p = eng.player;
    const theme = getLevelTheme(eng.level);

    if (p.ducking) {
      p.ducking = false;
      eng.keys.down = false;
      p.w = STAND_W;
      p.h = STAND_H;
      if (p.y + p.h > GROUND_Y) {
        p.y = GROUND_Y - STAND_H;
      }
    }

    if (p.jumpsUsed === 0) {
      p.vy = JUMP_VY;
      p.jumpsUsed = 1;
      sfx.jump(statsRef.current.muted);
      spawnParticles(p.x + p.w * 0.4, GROUND_Y - 4, theme.primary, 9, 3.6);
    } else if (p.jumpsUsed === 1) {
      p.vy = DOUBLE_JUMP_VY;
      p.jumpsUsed = 2;
      sfx.doubleJump(statsRef.current.muted);
      spawnParticles(p.x + p.w * 0.5, p.y + p.h, theme.secondary, 15, 4.6);
      addPopup(p.x + 24, p.y - 9, 'BOOST!', theme.secondary);
    }
  }, [resetEngineForNewRun, spawnParticles, addPopup]);

  const setDuckState = useCallback((isDown) => {
    const eng = engineRef.current;
    eng.keys.down = isDown;
    if (eng.status !== 'PLAYING') return;
    const p = eng.player;
    const onGround = p.y + p.h >= GROUND_Y - 1;

    if (isDown) {
      if (!p.ducking && onGround) {
        p.ducking = true;
        p.w = DUCK_W;
        p.h = DUCK_H;
        p.y = GROUND_Y - DUCK_H;
      }
    } else if (p.ducking) {
      p.ducking = false;
      p.w = STAND_W;
      p.h = STAND_H;
      if (p.y + p.h > GROUND_Y) {
        p.y = GROUND_Y - STAND_H;
      }
    }
  }, []);

  const togglePause = useCallback(() => {
    const eng = engineRef.current;
    if (eng.status === 'PLAYING') {
      eng.status = 'PAUSED';
      setGameState('PAUSED');
    } else if (eng.status === 'PAUSED') {
      eng.status = 'PLAYING';
      eng.lastTime = performance.now();
      setGameState('PLAYING');
    }
  }, []);

  const toggleMute = useCallback(() => {
    setStats((prev) => {
      const next = { ...prev, muted: !prev.muted };
      saveStats(next);
      return next;
    });
  }, []);

  const handleResetStats = useCallback(() => {
    const fresh = { ...DEFAULT_STATS, muted: statsRef.current.muted };
    setStats(fresh);
    saveStats(fresh);
    setConfirmReset(false);
  }, []);

  // Spawn ground obstacles, 3-lane Cyber Birds in the sky, and power-ups/tokens
  const spawnObstacleAndCollectibles = useCallback((eng) => {
    const currentScore = eng.score;
    const level = eng.level;
    const theme = getLevelTheme(level);
    const roll = Math.random();
    let primaryObs = null;

    const skyProb = Math.min(0.46, 0.28 + (level - 1) * 0.04);

    if (currentScore >= 20 && roll < skyProb) {
      // Spawn a SKY_BIRD (62x36) across one of 3 flight lanes:
      // 1) HIGH_SKY (punishes reckless double-jumping into the upper sky)
      // 2) MID_DUCK (head-height: standing bot H=62 hits it, ducking bot H=34 slides cleanly underneath!)
      // 3) LOW_SKIM / SWOOP (skims low or dives from high sky at Lvl 4+)
      const laneRoll = Math.random();
      let lane = 'MID_DUCK';
      let birdY = GROUND_Y - 84; // Bottom of bird is GROUND_Y - 48; ducking bot top is GROUND_Y - 34!

      if (laneRoll < 0.38) {
        lane = 'HIGH_SKY';
        birdY = 135 + Math.random() * 75;
      } else if (laneRoll < 0.76) {
        lane = 'MID_DUCK';
        birdY = GROUND_Y - 84;
      } else {
        lane = 'LOW_SKIM';
        birdY = GROUND_Y - 52;
      }

      const canWave = level >= 3 && Math.random() < 0.55;
      const canSwoop = level >= 4 && lane === 'HIGH_SKY' && Math.random() < 0.5;

      primaryObs = {
        type: 'SKY_BIRD',
        lane,
        label:
          lane === 'MID_DUCK'
            ? `${theme.birdLabel} [DUCK]`
            : theme.birdLabel,
        x: CANVAS_W + 55,
        y: birdY,
        baseY: birdY,
        w: 62,
        h: 36,
        wingPhase: Math.random() * Math.PI * 2,
        speedMult: 1.14 + Math.min(0.2, level * 0.028),
        oscillate: canWave && !canSwoop,
        waveAmp: lane === 'MID_DUCK' ? 10 : 24,
        swoop: canSwoop,
        swoopTargetY: GROUND_Y - 78,
        color: theme.birdColor,
        wingColor: theme.birdWingColor,
      };

      if (level >= 3 && Math.random() < 0.32) {
        const secondHigh = lane !== 'HIGH_SKY';
        eng.obstacles.push({
          type: 'SKY_BIRD',
          lane: secondHigh ? 'HIGH_SKY' : 'MID_DUCK',
          label: theme.birdLabel,
          x: CANVAS_W + 275,
          y: secondHigh ? 148 : GROUND_Y - 84,
          baseY: secondHigh ? 148 : GROUND_Y - 84,
          w: 58,
          h: 34,
          wingPhase: Math.random() * Math.PI * 2,
          speedMult: 1.13,
          oscillate: false,
          swoop: false,
          color: theme.birdColor,
          wingColor: theme.birdWingColor,
        });
      }
    } else if (level >= 4 && roll < skyProb + 0.16) {
      const isOverheadGate = Math.random() < 0.55;
      primaryObs = {
        type: 'LASER_GATE',
        isOverhead: isOverheadGate,
        label: isOverheadGate ? 'LASER [DUCK]' : 'FIREWALL_GATE',
        x: CANVAS_W + 55,
        y: isOverheadGate ? GROUND_Y - 220 : GROUND_Y - 88,
        w: 38,
        h: isOverheadGate ? 174 : 88, // Overhead bottom at GROUND_Y - 46 (ducking H=34 slides under!)
        color: theme.primary,
        accent: theme.obstacleColor,
        phase: 0,
      };
    } else if (roll < 0.62) {
      // Runtime Bug (46x44)
      const canHop = level >= 2 && Math.random() < 0.48;
      primaryObs = {
        type: 'BUG',
        label: canHop ? 'HOP_BUG' : 'SYNTAX_BUG',
        x: CANVAS_W + 55,
        y: GROUND_Y - 44,
        w: 46,
        h: 44,
        vy: 0,
        canHop,
        hopped: false,
        color: theme.obstacleColor,
        accent: theme.secondary,
      };
    } else if (roll < 0.84) {
      // 404 Server Firewall Tower (46x64 or 54x84)
      const tall = (currentScore > 120 || level >= 2) && Math.random() < 0.5;
      const h = tall ? 84 : 64;
      const w = tall ? 54 : 46;
      primaryObs = {
        type: 'SERVER_404',
        label: tall ? '500_ERR' : '404_BLK',
        x: CANVAS_W + 55,
        y: GROUND_Y - h,
        w,
        h,
        color: theme.primary,
        accent: theme.obstacleColor,
      };
    } else {
      // Git Merge Conflict Spikes (76x40)
      primaryObs = {
        type: 'CONFLICT',
        label: '<<<<<',
        x: CANVAS_W + 55,
        y: GROUND_Y - 40,
        w: 76,
        h: 40,
        color: theme.obstacleColor,
        accent: theme.secondary,
      };
    }

    eng.obstacles.push(primaryObs);

    if (
      level >= 5 &&
      primaryObs.type !== 'SKY_BIRD' &&
      Math.random() < 0.35
    ) {
      eng.obstacles.push({
        type: 'SKY_BIRD',
        lane: 'MID_DUCK',
        label: `${theme.birdLabel} [DUCK]`,
        x: primaryObs.x + primaryObs.w + 225,
        y: GROUND_Y - 84,
        baseY: GROUND_Y - 84,
        w: 58,
        h: 34,
        wingPhase: 0,
        speedMult: 1.06,
        oscillate: false,
        swoop: false,
        color: theme.birdColor,
        wingColor: theme.birdWingColor,
      });
    }

    const minGap = Math.max(
      265,
      290 + eng.speed * 15 - (level - 1) * 9
    );
    const maxGap = minGap + 160;
    eng.nextObstacleGap = minGap + Math.random() * (maxGap - minGap);

    // Collectible Spawn (~36% chance, radii r=16 / r=18)
    if (Math.random() < 0.36) {
      const powerRoll = Math.random();
      let colType = 'TOKEN';

      if (currentScore > 90 && powerRoll < 0.16) {
        if (!eng.player.hasShield && Math.random() < 0.5) {
          colType = 'SHIELD';
        } else if (eng.magnetTimer <= 0 && Math.random() < 0.6) {
          colType = 'MAGNET';
        } else if (eng.slowMoTimer <= 0) {
          colType = 'SLOW_MO';
        }
      }

      const tokenY =
        primaryObs.type === 'SKY_BIRD' && primaryObs.lane === 'MID_DUCK'
          ? GROUND_Y - 28
          : primaryObs.type === 'SKY_BIRD' && primaryObs.lane === 'HIGH_SKY'
          ? GROUND_Y - 105
          : Math.max(110, primaryObs.y - 66 - Math.random() * 34);

      eng.collectibles.push({
        type: colType,
        x: primaryObs.x + primaryObs.w * 0.5,
        y: tokenY,
        r: colType === 'TOKEN' ? 16 : 18,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }, []);

  const handleGameOver = useCallback(
    (eng, reasonText) => {
      eng.status = 'GAME_OVER';
      eng.crashReason = reasonText;
      sfx.gameOver(statsRef.current.muted);
      spawnParticles(
        eng.player.x + eng.player.w / 2,
        eng.player.y + eng.player.h / 2,
        '#ff5b1f',
        28,
        7.0
      );

      const finalScore = Math.floor(eng.score);
      const finalLevel = getLevelFromScore(finalScore);
      const prevStats = statsRef.current;
      const isNewRecord = finalScore > prevStats.highScore;

      const runEntry = {
        score: finalScore,
        level: finalLevel,
        world: getLevelTheme(finalLevel).name,
        tokens: eng.tokens,
        combo: eng.maxCombo,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };

      const updatedTopRuns = [...prevStats.topRuns, runEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const nextStats = {
        ...prevStats,
        highScore: Math.max(prevStats.highScore, finalScore),
        highestLevel: Math.max(prevStats.highestLevel || 1, finalLevel),
        totalGames: prevStats.totalGames + 1,
        totalTokens: prevStats.totalTokens + eng.tokens,
        bestStreak: Math.max(prevStats.bestStreak, eng.maxCombo),
        topRuns: updatedTopRuns,
      };

      setStats(nextStats);
      saveStats(nextStats);

      setHud({
        score: finalScore,
        level: finalLevel,
        levelProgress: Math.floor(((finalScore % LEVEL_STEP) / LEVEL_STEP) * 100),
        tokens: eng.tokens,
        combo: eng.combo,
        hasShield: false,
        magnetSec: 0,
        slowMoSec: 0,
        speedLevel: `${(eng.speed / START_SPEED).toFixed(1)}x`,
        isNewRecord,
        crashReason: reasonText,
      });
      setGameState('GAME_OVER');
    },
    [spawnParticles]
  );

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
        }
      }

      if (e.repeat && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setDuckState(true);
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setDuckState(false);
      }
    };

    const onBlur = () => {
      if (engineRef.current.status === 'PLAYING') {
        engineRef.current.status = 'PAUSED';
        setGameState('PAUSED');
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [triggerJump, setDuckState, togglePause]);

  // Main 60FPS Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;

    const updateEngine = (dt) => {
      const eng = engineRef.current;
      if (eng.status !== 'PLAYING') return;

      const dtFactor = Math.min(dt / 16.667, 2.5);
      const p = eng.player;

      if (eng.magnetTimer > 0) eng.magnetTimer = Math.max(0, eng.magnetTimer - dtFactor);
      if (eng.slowMoTimer > 0) eng.slowMoTimer = Math.max(0, eng.slowMoTimer - dtFactor);
      if (eng.invincibleTimer > 0) eng.invincibleTimer = Math.max(0, eng.invincibleTimer - dtFactor);
      if (eng.warpFlash > 0) eng.warpFlash = Math.max(0, eng.warpFlash - 0.03 * dtFactor);

      // Chrome-Dino-calibrated score rate (~10 pts/sec at base speed)
      eng.distance += (eng.baseSpeed / START_SPEED) * 0.165 * dtFactor;
      eng.score = Math.floor(eng.distance + eng.bonusScore);

      // Check Level Progression every 500 points
      const computedLevel = getLevelFromScore(eng.score);
      if (computedLevel > eng.level) {
        eng.level = computedLevel;
        eng.warpFlash = 0.85;
        const nextTheme = getLevelTheme(computedLevel);
        sfx.levelUp(statsRef.current.muted);
        triggerLevelBanner(nextTheme);
        addPopup(
          CANVAS_W * 0.5,
          120,
          `LEVEL ${computedLevel}: ${nextTheme.name.toUpperCase()}!`,
          nextTheme.primary
        );
      }

      // Fast speed progression (starts at 9.5, scales up to 21.0)
      eng.baseSpeed = Math.min(
        21.0,
        START_SPEED + (eng.level - 1) * 1.6 + ((eng.score % LEVEL_STEP) / LEVEL_STEP) * 1.25
      );
      eng.speed = eng.slowMoTimer > 0 ? eng.baseSpeed * 0.72 : eng.baseSpeed;

      eng.groundOffset = (eng.groundOffset + eng.speed * dtFactor) % 60;
      const theme = getLevelTheme(eng.level);

      eng.bgNodes.forEach((node) => {
        if (theme.bgStyle === 'matrix') {
          node.y += node.vy * 2.3 * dtFactor;
          if (node.y > GROUND_Y - 10) {
            node.y = 15;
            node.x = Math.random() * CANVAS_W;
          }
        } else if (theme.bgStyle === 'inferno') {
          node.y -= node.vy * 1.5 * dtFactor;
          node.x -= eng.speed * 0.22 * dtFactor;
          if (node.y < 20 || node.x < -20) {
            node.y = GROUND_Y - 10;
            node.x = Math.random() * (CANVAS_W + 100);
          }
        } else {
          const mult = theme.bgStyle === 'quantum' ? 1.65 : node.speedFactor;
          node.x -= eng.speed * mult * dtFactor;
          if (node.x < -40) {
            node.x = CANVAS_W + 30;
            node.y = 36 + Math.random() * (GROUND_Y - 75);
          }
        }
      });

      const activeGravity =
        eng.keys.down && p.y + p.h < GROUND_Y ? FAST_FALL_GRAVITY : GRAVITY;
      p.vy += activeGravity * dtFactor;
      p.y += p.vy * dtFactor;

      const targetH = eng.keys.down ? DUCK_H : STAND_H;
      const targetW = eng.keys.down ? DUCK_W : STAND_W;
      if (p.y + targetH >= GROUND_Y) {
        p.ducking = eng.keys.down;
        p.h = targetH;
        p.w = targetW;
        p.y = GROUND_Y - p.h;
        p.vy = 0;
        p.jumpsUsed = 0;
      } else {
        p.legFrame += 0.17 * dtFactor;
      }
      if (p.y + p.h >= GROUND_Y - 1) {
        p.legFrame += eng.speed * 0.046 * dtFactor;
      }

      const lastObs = eng.obstacles[eng.obstacles.length - 1];
      if (!lastObs || CANVAS_W - (lastObs.x + lastObs.w) >= eng.nextObstacleGap) {
        spawnObstacleAndCollectibles(eng);
      }

      const hitboxPad = 8;
      const px1 = p.x + hitboxPad;
      const py1 = p.y + hitboxPad;
      const px2 = p.x + p.w - hitboxPad;
      const py2 = p.y + p.h - hitboxPad;

      for (let i = eng.obstacles.length - 1; i >= 0; i--) {
        const obs = eng.obstacles[i];
        const moveMult = obs.speedMult || 1;
        obs.x -= eng.speed * moveMult * dtFactor;

        if (obs.type === 'SKY_BIRD') {
          obs.wingPhase += 0.27 * dtFactor;
          if (obs.oscillate) {
            obs.y = obs.baseY + Math.sin(obs.wingPhase * 0.6) * (obs.waveAmp || 20);
          } else if (obs.swoop && obs.x < CANVAS_W * 0.74) {
            obs.y += (obs.swoopTargetY - obs.y) * 0.05 * dtFactor;
          }
        } else if (obs.type === 'BUG' && obs.canHop) {
          if (!obs.hopped && obs.x - (p.x + p.w) < 235 && obs.x > p.x) {
            obs.vy = -10.2;
            obs.hopped = true;
          }
          if (obs.hopped) {
            obs.vy += 0.58 * dtFactor;
            obs.y += obs.vy * dtFactor;
            if (obs.y + obs.h >= GROUND_Y) {
              obs.y = GROUND_Y - obs.h;
              obs.vy = 0;
            }
          }
        } else if (obs.phase !== undefined) {
          obs.phase += 0.14 * dtFactor;
        }

        if (obs.x + obs.w < -90) {
          eng.obstacles.splice(i, 1);
          continue;
        }

        const ox1 = obs.x + 7;
        const oy1 = obs.y + 7;
        const ox2 = obs.x + obs.w - 7;
        const oy2 = obs.y + obs.h - 7;

        const collided =
          px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1;

        if (collided && eng.invincibleTimer <= 0) {
          if (p.hasShield) {
            p.hasShield = false;
            eng.invincibleTimer = 32;
            eng.bonusScore += 10;
            sfx.shieldBreak(statsRef.current.muted);
            spawnParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, theme.primary, 22, 5.8);
            addPopup(p.x + 22, p.y - 12, 'SHIELD BLOCKED! +10', theme.primary);
            eng.obstacles.splice(i, 1);
          } else {
            const reasonMap = {
              SKY_BIRD: `Aerial Collision: Intercepted by ${obs.label}`,
              LASER_GATE: 'Security Breach: Hit Laser Firewall Gate',
              BUG: 'Uncaught SyntaxError: Runtime Bug Collision',
              SERVER_404: 'HTTP 404: Firewall Tower Connection Refused',
              CONFLICT: 'Git Merge Conflict: Unresolved Branch Hazard',
            };
            handleGameOver(eng, reasonMap[obs.type] || 'System Crash');
            return;
          }
        }
      }

      const pCenterX = p.x + p.w * 0.5;
      const pCenterY = p.y + p.h * 0.5;

      for (let i = eng.collectibles.length - 1; i >= 0; i--) {
        const col = eng.collectibles[i];
        col.x -= eng.speed * dtFactor;
        col.phase += 0.1 * dtFactor;

        if (eng.magnetTimer > 0 && col.type === 'TOKEN') {
          const dxMag = pCenterX - col.x;
          const dyMag = pCenterY - col.y;
          const distMag = Math.hypot(dxMag, dyMag);
          if (distMag < 360 && distMag > 1) {
            col.x += (dxMag / distMag) * (eng.speed + 6.0) * dtFactor;
            col.y += (dyMag / distMag) * 9.0 * dtFactor;
          }
        }

        if (col.x + col.r < p.x - 24) {
          if (col.type === 'TOKEN' && !col.missed) {
            col.missed = true;
            eng.combo = 1;
          }
        }

        if (col.x + col.r < -45) {
          eng.collectibles.splice(i, 1);
          continue;
        }

        const closestX = Math.max(p.x, Math.min(col.x, p.x + p.w));
        const closestY = Math.max(p.y, Math.min(col.y, p.y + p.h));
        const dx = col.x - closestX;
        const dy = col.y - closestY;
        if (dx * dx + dy * dy <= (col.r + 7) * (col.r + 7)) {
          if (col.type === 'SHIELD') {
            p.hasShield = true;
            eng.bonusScore += 8;
            sfx.powerup(statsRef.current.muted);
            spawnParticles(col.x, col.y, '#1ec6ff', 16, 4.2);
            addPopup(col.x, col.y - 11, 'SUDO SHIELD!', '#1ec6ff');
          } else if (col.type === 'MAGNET') {
            eng.magnetTimer = 420;
            eng.bonusScore += 8;
            sfx.powerup(statsRef.current.muted);
            spawnParticles(col.x, col.y, '#d946ef', 16, 4.2);
            addPopup(col.x, col.y - 11, 'TOKEN MAGNET!', '#d946ef');
          } else if (col.type === 'SLOW_MO') {
            eng.slowMoTimer = 300;
            eng.bonusScore += 8;
            sfx.powerup(statsRef.current.muted);
            spawnParticles(col.x, col.y, '#00e676', 16, 4.2);
            addPopup(col.x, col.y - 11, 'DEBUG SLOW-MO!', '#00e676');
          } else {
            const pts = 5 + (eng.combo - 1) * 2;
            eng.bonusScore += pts;
            eng.tokens += 1;
            sfx.token(statsRef.current.muted, eng.combo);
            spawnParticles(col.x, col.y, '#FFC107', 12, 3.8);
            addPopup(
              col.x,
              col.y - 11,
              `+${pts} ${eng.combo > 1 ? `(${eng.combo}x)` : '</>'}`,
              '#FFC107'
            );
            eng.combo = Math.min(4, eng.combo + 1);
            eng.maxCombo = Math.max(eng.maxCombo, eng.combo);
          }
          eng.collectibles.splice(i, 1);
        }
      }

      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx * dtFactor;
        pt.y += pt.vy * dtFactor;
        pt.vy += 0.15 * dtFactor;
        pt.life -= pt.decay * dtFactor;
        if (pt.life <= 0) {
          eng.particles.splice(i, 1);
        }
      }

      for (let i = eng.popups.length - 1; i >= 0; i--) {
        const pop = eng.popups[i];
        pop.y -= 1.15 * dtFactor;
        pop.life -= 0.022 * dtFactor;
        if (pop.life <= 0) {
          eng.popups.splice(i, 1);
        }
      }

      const now = performance.now();
      if (now - eng.lastHudSync > 90) {
        eng.lastHudSync = now;
        setHud({
          score: eng.score,
          level: eng.level,
          levelProgress: Math.floor(((eng.score % LEVEL_STEP) / LEVEL_STEP) * 100),
          tokens: eng.tokens,
          combo: eng.combo,
          hasShield: p.hasShield,
          magnetSec: Math.ceil(eng.magnetTimer / 60),
          slowMoSec: Math.ceil(eng.slowMoTimer / 60),
          speedLevel: `${(eng.speed / START_SPEED).toFixed(1)}x`,
          isNewRecord: eng.score > statsRef.current.highScore,
          crashReason: '',
        });
      }
    };

    const drawScene = () => {
      const eng = engineRef.current;
      const theme = getLevelTheme(eng.level);
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Dynamic Level Sky Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, theme.skyTop);
      bgGrad.addColorStop(0.72, theme.skyMid);
      bgGrad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Level-Specific Background World FX
      if (theme.bgStyle === 'matrix') {
        ctx.font = 'bold 13px monospace';
        eng.bgNodes.forEach((node) => {
          ctx.fillStyle = 'rgba(0, 230, 118, 0.26)';
          ctx.fillText(node.char, node.x, node.y);
          ctx.fillStyle = 'rgba(105, 240, 174, 0.12)';
          ctx.fillText('1', node.x, node.y - 16);
          ctx.fillText('0', node.x, node.y - 32);
        });
      } else if (theme.bgStyle === 'clouds') {
        eng.bgNodes.forEach((node) => {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.12)';
          ctx.beginPath();
          ctx.roundRect(node.x, node.y * 0.75, node.size * 22, node.size * 8, 12);
          ctx.fill();
        });
      } else if (theme.bgStyle === 'neural') {
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.15)';
        ctx.lineWidth = 1.1;
        for (let i = 0; i < eng.bgNodes.length; i++) {
          const a = eng.bgNodes[i];
          const b = eng.bgNodes[(i + 1) % eng.bgNodes.length];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 230) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(240, 171, 252, 0.34)';
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.size + 1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme.bgStyle === 'inferno') {
        eng.bgNodes.forEach((node) => {
          ctx.fillStyle = 'rgba(255, 171, 0, 0.36)';
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 1.15, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (theme.bgStyle === 'quantum') {
        ctx.strokeStyle = 'rgba(255, 213, 79, 0.3)';
        ctx.lineWidth = 2;
        eng.bgNodes.forEach((node) => {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(node.x + node.size * 18, node.y);
          ctx.stroke();
        });
      }

      // Perspective Cyber Grid Overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let gx = -eng.groundOffset; gx < CANVAS_W; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, GROUND_Y);
        ctx.stroke();
      }
      for (let gy = 60; gy < GROUND_Y; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CANVAS_W, gy);
        ctx.stroke();
      }

      // 3. Ground Track
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      groundGrad.addColorStop(0, theme.groundTop);
      groundGrad.addColorStop(1, theme.groundBot);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.6;
      for (let tx = -eng.groundOffset; tx < CANVAS_W + 60; tx += 60) {
        ctx.beginPath();
        ctx.moveTo(tx, GROUND_Y + 18);
        ctx.lineTo(tx + 28, GROUND_Y + 18);
        ctx.lineTo(tx + 40, GROUND_Y + 34);
        ctx.stroke();

        ctx.fillStyle = theme.secondary;
        ctx.beginPath();
        ctx.arc(tx + 40, GROUND_Y + 34, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Collectibles (Code Tokens & Power-Ups)
      const p = eng.player;
      eng.collectibles.forEach((col) => {
        const bobY = col.y + Math.sin(col.phase) * 5;

        if (eng.magnetTimer > 0 && col.type === 'TOKEN') {
          const dist = Math.hypot(p.x + p.w / 2 - col.x, p.y + p.h / 2 - bobY);
          if (dist < 360) {
            ctx.save();
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.48)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(col.x, bobY);
            ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.save();
        ctx.translate(col.x, bobY);

        if (col.type === 'SHIELD') {
          ctx.fillStyle = 'rgba(30, 198, 255, 0.24)';
          ctx.beginPath();
          ctx.arc(0, 0, col.r + 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#072642';
          ctx.strokeStyle = '#1ec6ff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, col.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#eaf2ff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SHD', 0, 1);
        } else if (col.type === 'MAGNET') {
          ctx.fillStyle = 'rgba(217, 70, 239, 0.24)';
          ctx.beginPath();
          ctx.arc(0, 0, col.r + 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#280938';
          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, col.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f5d0fe';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('MAG', 0, 1);
        } else if (col.type === 'SLOW_MO') {
          ctx.fillStyle = 'rgba(0, 230, 118, 0.24)';
          ctx.beginPath();
          ctx.arc(0, 0, col.r + 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#052916';
          ctx.strokeStyle = '#00e676';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, col.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#b9f6ca';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('DBG', 0, 1);
        } else {
          ctx.fillStyle = 'rgba(255, 193, 7, 0.22)';
          ctx.beginPath();
          ctx.arc(0, 0, col.r + 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#142d4c';
          ctx.strokeStyle = '#FFC107';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, col.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FFC107';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('</>', 0, 1);
        }
        ctx.restore();
      });

      // 5. Obstacles (Ground Hazards + Sky Cyber Birds + Laser Gates)
      eng.obstacles.forEach((obs) => {
        ctx.save();
        if (obs.type === 'SKY_BIRD') {
          // Animated Cyber Bird in the Sky (62x36)
          const cx = obs.x + obs.w * 0.5;
          const cy = obs.y + obs.h * 0.5;
          const wingFlap = Math.sin(obs.wingPhase) * 18;

          // Afterburner tail trail
          ctx.fillStyle = obs.wingColor || theme.primary;
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.w - 5, cy - 4);
          ctx.lineTo(obs.x + obs.w + 18, cy - 8);
          ctx.lineTo(obs.x + obs.w + 12, cy);
          ctx.lineTo(obs.x + obs.w + 19, cy + 8);
          ctx.lineTo(obs.x + obs.w - 5, cy + 4);
          ctx.closePath();
          ctx.fill();

          // Flapping Cyber Wings
          ctx.fillStyle = obs.wingColor || theme.primary;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy);
          ctx.lineTo(cx + 8, cy - wingFlap - 6);
          ctx.lineTo(cx + 21, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sleek Bird Fuselage / Head
          ctx.fillStyle = '#0b192c';
          ctx.strokeStyle = obs.color || theme.secondary;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(obs.x, cy + 2);
          ctx.lineTo(obs.x + 18, obs.y + 5);
          ctx.lineTo(obs.x + obs.w - 5, cy - 5);
          ctx.lineTo(obs.x + obs.w - 2, cy + 6);
          ctx.lineTo(obs.x + 18, obs.y + obs.h - 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing Laser Eye
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.arc(obs.x + 15, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Callout Tag above Bird
          ctx.fillStyle = obs.color || '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(obs.label, obs.x + 2, obs.y - 7);
        } else if (obs.type === 'LASER_GATE') {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.24)';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 7);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.w / 2, obs.y + 5);
          ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h - 5);
          ctx.stroke();

          ctx.fillStyle = '#fda4af';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(obs.label, obs.x - 10, obs.y - 7);
        } else if (obs.type === 'BUG') {
          // Runtime Bug (46x44)
          ctx.fillStyle = '#220b18';
          ctx.strokeStyle = obs.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y + 6, obs.w, obs.h - 6, 9);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffbf00';
          ctx.fillRect(obs.x + 8, obs.y + 15, 6.5, 6.5);
          ctx.fillRect(obs.x + 19, obs.y + 15, 6.5, 6.5);

          ctx.fillStyle = obs.color;
          ctx.fillRect(obs.x + 7, obs.y + 28, obs.w - 14, 5);

          ctx.fillStyle = obs.accent;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(obs.label, obs.x - 4, obs.y - 2);
        } else if (obs.type === 'SERVER_404') {
          // 404 Firewall Tower (46x64 or 54x84)
          ctx.fillStyle = '#0d2238';
          ctx.strokeStyle = obs.accent;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 7);
          ctx.fill();
          ctx.stroke();

          for (let sy = obs.y + 9; sy < obs.y + obs.h - 10; sy += 14) {
            ctx.fillStyle = '#163859';
            ctx.fillRect(obs.x + 6, sy, obs.w - 12, 8);
            ctx.fillStyle = obs.accent;
            ctx.beginPath();
            ctx.arc(obs.x + obs.w - 11, sy + 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#ffbf00';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(obs.label, obs.x + 2, obs.y - 5);
        } else {
          // Git Merge Conflict Spikes (76x40)
          ctx.fillStyle = obs.color;
          ctx.strokeStyle = '#ffbf00';
          ctx.lineWidth = 1.8;
          const spikes = 3;
          const sw = obs.w / spikes;
          for (let s = 0; s < spikes; s++) {
            const sx = obs.x + s * sw;
            ctx.beginPath();
            ctx.moveTo(sx, GROUND_Y);
            ctx.lineTo(sx + sw * 0.5, obs.y);
            ctx.lineTo(sx + sw, GROUND_Y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = obs.accent;
          ctx.font = 'bold 11px monospace';
          ctx.fillText('CONFLICT', obs.x + 8, obs.y - 5);
        }
        ctx.restore();
      });

      // 6. Player (MSP Cyber Bot: 50x62 standing, 60x34 ducking)
      ctx.save();

      if (eng.invincibleTimer > 0 && Math.floor(eng.invincibleTimer) % 2 === 1) {
        ctx.globalAlpha = 0.55;
      }

      if (p.hasShield) {
        ctx.strokeStyle = 'rgba(30, 198, 255, 0.88)';
        ctx.fillStyle = 'rgba(30, 198, 255, 0.14)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(
          p.x + p.w / 2,
          p.y + p.h / 2,
          Math.max(p.w, p.h) * 0.72,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }

      if (eng.magnetTimer > 0) {
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.58)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          p.x + p.w / 2,
          p.y + p.h / 2,
          Math.max(p.w, p.h) * 0.9,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (!p.ducking) {
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w * 0.5, p.y);
        ctx.lineTo(p.x + p.w * 0.5, p.y - 10);
        ctx.stroke();

        ctx.fillStyle = theme.secondary;
        ctx.beginPath();
        ctx.arc(p.x + p.w * 0.5, p.y - 11, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#102a46';
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h - 6, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.secondary;
      const visorY = p.ducking ? p.y + 7 : p.y + 11;
      const visorH = p.ducking ? 9 : 12;
      ctx.beginPath();
      ctx.roundRect(p.x + p.w - 26, visorY, 20, visorH, 4);
      ctx.fill();

      if (!p.ducking) {
        const cx = p.x + 12;
        const cy = p.y + 29;
        ctx.fillStyle = '#F4581F';
        ctx.fillRect(cx, cy, 6, 6);
        ctx.fillStyle = '#83BD00';
        ctx.fillRect(cx + 7.5, cy, 6, 6);
        ctx.fillStyle = '#03A9F4';
        ctx.fillRect(cx, cy + 7.5, 6, 6);
        ctx.fillStyle = '#FFC107';
        ctx.fillRect(cx + 7.5, cy + 7.5, 6, 6);
      }

      if (p.y + p.h < GROUND_Y - 2) {
        ctx.fillStyle = p.jumpsUsed === 2 ? theme.secondary : '#FFC107';
        ctx.beginPath();
        ctx.moveTo(p.x + 12, p.y + p.h - 6);
        ctx.lineTo(p.x + 19, p.y + p.h + 9);
        ctx.lineTo(p.x + 26, p.y + p.h - 6);
        ctx.fill();
      } else {
        const legSwing = Math.sin(p.legFrame) * 6.5;
        ctx.strokeStyle = '#8EC2F0';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x + 15, p.y + p.h - 6);
        ctx.lineTo(p.x + 15 + legSwing, GROUND_Y - 1);
        ctx.moveTo(p.x + p.w - 15, p.y + p.h - 6);
        ctx.lineTo(p.x + p.w - 15 - legSwing, GROUND_Y - 1);
        ctx.stroke();
      }

      ctx.restore();

      // 7. Particles
      eng.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Floating Popups
      eng.popups.forEach((pop) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.life);
        ctx.fillStyle = pop.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });

      // 9. Level Warp Transition Flash Overlay
      if (eng.warpFlash > 0) {
        ctx.save();
        ctx.globalAlpha = eng.warpFlash * 0.35;
        ctx.fillStyle = theme.primary;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      // 10. Top-Left World Badge & Top-Right Score Readout on Canvas
      ctx.fillStyle = theme.secondary;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `LVL ${eng.level} // ${theme.name.toUpperCase()}`,
        22,
        34
      );

      ctx.fillStyle = 'rgba(234, 242, 255, 0.92)';
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'right';
      const paddedScore = String(eng.score).padStart(5, '0');
      const paddedBest = String(
        Math.max(statsRef.current.highScore, eng.score)
      ).padStart(5, '0');
      ctx.fillText(`HI ${paddedBest}   ${paddedScore}`, CANVAS_W - 24, 34);

      ctx.restore();
    };

    const tick = (now) => {
      const eng = engineRef.current;
      if (!eng.lastTime) eng.lastTime = now;
      const dt = now - eng.lastTime;
      eng.lastTime = now;

      updateEngine(dt);
      drawScene();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    spawnObstacleAndCollectibles,
    handleGameOver,
    spawnParticles,
    addPopup,
    triggerLevelBanner,
  ]);

  const unlockedBadgesCount = useMemo(
    () => TECH_BADGES.filter((b) => stats.highScore >= b.threshold).length,
    [stats.highScore]
  );

  const nextLevelScore = hud.level * LEVEL_STEP;

  return (
    <section
      className={`CyberRunnerPage ${theaterMode ? 'CyberRunnerPage--theater' : ''}`}
      style={{
        '--theme-primary': activeTheme.primary,
        '--theme-secondary': activeTheme.secondary,
        '--theme-surface': activeTheme.surface,
        '--theme-glow': activeTheme.glow,
      }}
    >
      <SEO
        title="Cyber Runner Minigame | MSP Tech Club — MIU"
        description="Play MSP Cyber Runner! Unlock evolving tech worlds every 500 points, dodge runtime bugs and sky Cyber Birds, and set your personal best."
        url="/game"
      />

      <div className="CyberRunner__container">
        <div className="CyberRunner__topRow">
          <BackButton to="/" label="Back to Home" />
          <div className="CyberRunner__topActions">
            <button
              type="button"
              className={`CyberRunner__iconBtn ${theaterMode ? 'CyberRunner__iconBtn--active' : ''}`}
              onClick={handleToggleTheater}
              aria-pressed={theaterMode}
              title={theaterMode ? 'Switch to Standard Screen Size' : 'Expand Game Screen to Wide Theater Mode'}
            >
              {theaterMode ? <FaCompress /> : <FaExpand />}
              <span>{theaterMode ? 'Standard View' : 'Wide View'}</span>
            </button>
            <button
              type="button"
              className="CyberRunner__iconBtn"
              onClick={toggleMute}
              aria-label={stats.muted ? 'Unmute game audio' : 'Mute game audio'}
            >
              {stats.muted ? <FaVolumeMute /> : <FaVolumeUp />}
              <span>{stats.muted ? 'Sound Off' : 'Sound On'}</span>
            </button>
            {gameState === 'PLAYING' || gameState === 'PAUSED' ? (
              <button
                type="button"
                className="CyberRunner__iconBtn"
                onClick={togglePause}
              >
                {gameState === 'PAUSED' ? <FaPlay /> : <FaPause />}
                <span>{gameState === 'PAUSED' ? 'Resume' : 'Pause'}</span>
              </button>
            ) : null}
          </div>
        </div>

        <header className="CyberRunner__header">
          <div className="CyberRunner__badgePill">
            <FaGamepad />
            <span>
              MSP TECH ARCADE &bull; LEVEL {hud.level}: {activeTheme.name.toUpperCase()}
            </span>
          </div>
          <h1 className="CyberRunner__title">MSP Cyber Runner</h1>
          <p className="CyberRunner__subtitle">
            Jump over ground bugs, <strong>duck under mid-sky Cyber Birds</strong>, avoid high-sky
            flocks, and reach every <strong>500-point milestone</strong> to warp into a new tech
            world!
          </p>
        </header>

        {/* Live Level & World Progress Bar */}
        <div className="CyberRunner__levelBar">
          <div className="CyberRunner__levelBarInfo">
            <div className="CyberRunner__levelTag">
              <FaLayerGroup />
              <strong>
                Level {hud.level}: {activeTheme.name}
              </strong>
              <span className="CyberRunner__levelHazardHint">
                &mdash; {activeTheme.hazardHint}
              </span>
            </div>
            <div className="CyberRunner__levelNext">
              <span>
                Next World at <strong>{nextLevelScore.toLocaleString()} pts</strong> (
                {hud.levelProgress}%)
              </span>
            </div>
          </div>
          <div className="CyberRunner__progressTrack">
            <div
              className="CyberRunner__progressFill"
              style={{ width: `${hud.levelProgress}%` }}
            />
          </div>
        </div>

        {/* Live HUD Strip */}
        <div className="CyberRunner__hudGrid" role="status" aria-live="polite">
          <div className="CyberRunner__hudCard">
            <span className="CyberRunner__hudLabel">Current Score</span>
            <strong className="CyberRunner__hudValue CyberRunner__hudValue--primary">
              {hud.score.toLocaleString()}
              <small className="CyberRunner__speedTag">{hud.speedLevel}</small>
            </strong>
          </div>
          <div className="CyberRunner__hudCard">
            <span className="CyberRunner__hudLabel">
              <FaTrophy className="CyberRunner__hudIconGold" /> Personal Best
            </span>
            <strong className="CyberRunner__hudValue CyberRunner__hudValue--gold">
              {Math.max(stats.highScore, hud.score).toLocaleString()}
            </strong>
          </div>
          <div className="CyberRunner__hudCard">
            <span className="CyberRunner__hudLabel">
              <FaCode className="CyberRunner__hudIconCyan" /> Tokens &amp; Combo
            </span>
            <strong className="CyberRunner__hudValue">
              {hud.tokens} <small className="CyberRunner__comboTag">{hud.combo}x</small>
            </strong>
          </div>
          <div className="CyberRunner__hudCard">
            <span className="CyberRunner__hudLabel">
              <FaShieldAlt className="CyberRunner__hudIconGreen" /> Active Power-Ups
            </span>
            <div className="CyberRunner__powerPills">
              <span
                className={`CyberRunner__powerPill ${
                  hud.hasShield ? 'is-active-shield' : ''
                }`}
              >
                <FaShieldAlt /> {hud.hasShield ? 'SHD ON' : 'SHD'}
              </span>
              <span
                className={`CyberRunner__powerPill ${
                  hud.magnetSec > 0 ? 'is-active-magnet' : ''
                }`}
              >
                <FaMagnet /> {hud.magnetSec > 0 ? `${hud.magnetSec}s` : 'MAG'}
              </span>
              <span
                className={`CyberRunner__powerPill ${
                  hud.slowMoSec > 0 ? 'is-active-slowmo' : ''
                }`}
              >
                <FaBug /> {hud.slowMoSec > 0 ? `${hud.slowMoSec}s` : 'DBG'}
              </span>
            </div>
          </div>
        </div>

        {/* Enlarged Game Viewport & Overlays */}
        <div ref={stageWrapRef} className="CyberRunner__stageWrap">
          <canvas
            ref={canvasRef}
            className="CyberRunner__canvas"
            onClick={() => {
              if (gameState === 'PLAYING') {
                triggerJump();
              }
            }}
            aria-label="MSP Cyber Runner game canvas"
          />

          {/* Non-Blocking Level-Up Warp Banner */}
          <AnimatePresence>
            {levelBanner && gameState === 'PLAYING' && (
              <motion.div
                className="CyberRunner__levelUpBanner"
                initial={{ opacity: 0, y: -28, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <span className="CyberRunner__levelUpKicker">
                  LEVEL {levelBanner.level} UNLOCKED!
                </span>
                <strong>{levelBanner.name}</strong>
                <span>{levelBanner.hazardHint}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {gameState === 'IDLE' && (
              <motion.div
                className="CyberRunner__overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="CyberRunner__overlayCard">
                  <div className="CyberRunner__overlayIcon">
                    <FaBolt />
                  </div>
                  <h2>Ready to Deploy?</h2>
                  <p>
                    Press <kbd>Space</kbd> / <kbd>↑</kbd> to Jump (tap twice for{' '}
                    <strong>Double Jump</strong>) and hold <kbd>↓</kbd> to{' '}
                    <strong>Duck under Cyber Birds</strong>. Every <strong>500 pts</strong> warps
                    you into a brand-new tech world!
                  </p>
                  <button
                    type="button"
                    className="CyberRunner__primaryBtn"
                    onClick={triggerJump}
                  >
                    <FaPlay /> Start Run
                  </button>
                </div>
              </motion.div>
            )}

            {gameState === 'PAUSED' && (
              <motion.div
                className="CyberRunner__overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="CyberRunner__overlayCard">
                  <h2>Execution Paused</h2>
                  <p>
                    Currently in <strong>Level {hud.level}: {activeTheme.name}</strong>.
                  </p>
                  <div className="CyberRunner__overlayBtns">
                    <button
                      type="button"
                      className="CyberRunner__primaryBtn"
                      onClick={togglePause}
                    >
                      <FaPlay /> Resume Run
                    </button>
                    <button
                      type="button"
                      className="CyberRunner__secondaryBtn"
                      onClick={resetEngineForNewRun}
                    >
                      <FaRedo /> Restart
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'GAME_OVER' && (
              <motion.div
                className="CyberRunner__overlay"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="CyberRunner__overlayCard CyberRunner__overlayCard--gameover">
                  <h2 className="CyberRunner__crashTitle">SYSTEM CRASHED</h2>
                  <p className="CyberRunner__crashLog">{hud.crashReason}</p>

                  <div className="CyberRunner__crashScoreBlock">
                    <div className="CyberRunner__crashScoreMain">
                      SCORE: <span>{hud.score.toLocaleString()}</span>
                    </div>
                    {hud.isNewRecord ? (
                      <div className="CyberRunner__newRecordBadge">
                        <FaFire /> NEW PERSONAL BEST!
                      </div>
                    ) : (
                      <div className="CyberRunner__crashSubMeta">
                        BEST: {stats.highScore.toLocaleString()} &bull; WORLD LVL {hud.level}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="CyberRunner__primaryBtn CyberRunner__primaryBtn--gameover"
                    onClick={resetEngineForNewRun}
                  >
                    <FaRedo /> Play Again (Space)
                  </button>

                  <div className="CyberRunner__recruitCta">
                    <div className="CyberRunner__recruitDivider" aria-hidden="true" />
                    <p className="CyberRunner__recruitPrompt">Want to build things like this?</p>
                    <strong className="CyberRunner__recruitClub">Join MSP Tech Club — MIU</strong>
                    <Link to="/become-member" className="CyberRunner__recruitLink">
                      msp-miu.tech/become-member
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile / Touch Action Controls & Desktop Key Legend */}
        <div className="CyberRunner__controlsBar">
          <div className="CyberRunner__touchControls">
            <button
              type="button"
              className="CyberRunner__touchBtn CyberRunner__touchBtn--jump"
              onPointerDown={(e) => {
                e.preventDefault();
                triggerJump();
              }}
            >
              <FaArrowUp />
              <span>JUMP / DOUBLE JUMP</span>
            </button>
            <button
              type="button"
              className="CyberRunner__touchBtn CyberRunner__touchBtn--duck"
              onPointerDown={(e) => {
                e.preventDefault();
                setDuckState(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                setDuckState(false);
              }}
              onPointerLeave={() => setDuckState(false)}
              onPointerCancel={() => setDuckState(false)}
            >
              <FaArrowDown />
              <span>HOLD TO DUCK (BIRDS &amp; GATES)</span>
            </button>
          </div>

          <div className="CyberRunner__keyboardLegend">
            <span>
              <kbd>Space</kbd> / <kbd>↑</kbd> / <kbd>W</kbd> Jump &amp; Double-Jump
            </span>
            <span>
              <kbd>↓</kbd> / <kbd>S</kbd> Duck under Sky Birds &amp; Fast-Fall
            </span>
            <span>
              <kbd>P</kbd> Pause
            </span>
          </div>
        </div>

        {/* Discovered Worlds Strip */}
        <div className="CyberRunner__worldsCard">
          <div className="CyberRunner__panelHeader">
            <h3>
              <FaLayerGroup className="CyberRunner__panelIconCyan" /> Tech Worlds Progression
              (New Theme Every 500 Pts)
            </h3>
            <span className="CyberRunner__gamesCount">
              Highest World: Level {stats.highestLevel || 1}
            </span>
          </div>
          <div className="CyberRunner__worldsGrid">
            {CORE_THEMES.map((t) => {
              const unlocked = (stats.highestLevel || 1) >= t.level || hud.level >= t.level;
              const isCurrent = hud.level === t.level;
              return (
                <div
                  key={t.level}
                  className={`CyberRunner__worldChip ${unlocked ? 'is-unlocked' : 'is-locked'} ${
                    isCurrent ? 'is-current' : ''
                  }`}
                  style={{
                    '--chip-color': t.primary,
                  }}
                >
                  <div className="CyberRunner__worldChipTop">
                    <span className="CyberRunner__worldLvl">LVL {t.level}</span>
                    <span className="CyberRunner__worldPts">
                      {(t.level - 1) * LEVEL_STEP}+ pts
                    </span>
                  </div>
                  <strong>{unlocked ? t.name : 'Locked Sector'}</strong>
                  <small>{unlocked ? `Sky: ${t.birdLabel}` : `Reach ${(t.level - 1) * LEVEL_STEP} pts`}</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* Local Stats, Top Runs & Tech Badges */}
        <div className="CyberRunner__bottomGrid">
          {/* Personal Scoreboard Card */}
          <div className="CyberRunner__panel">
            <div className="CyberRunner__panelHeader">
              <h3>
                <FaTrophy className="CyberRunner__panelIconGold" /> Your Top Local Runs
              </h3>
              <span className="CyberRunner__gamesCount">
                {stats.totalGames} {stats.totalGames === 1 ? 'Run' : 'Runs'} Played
              </span>
            </div>

            {stats.topRuns.length === 0 ? (
              <p className="CyberRunner__emptyText">
                No runs recorded in this browser yet. Hit <strong>Start Run</strong> above to set
                your first high score!
              </p>
            ) : (
              <ul className="CyberRunner__runsList">
                {stats.topRuns.map((run, idx) => (
                  <li key={`${run.score}-${idx}`} className="CyberRunner__runItem">
                    <span className={`CyberRunner__runRank CyberRunner__runRank--${idx + 1}`}>
                      #{idx + 1}
                    </span>
                    <div className="CyberRunner__runInfo">
                      <strong>{run.score.toLocaleString()} pts</strong>
                      <span>
                        Lvl {run.level || getLevelFromScore(run.score)} ({run.world || getLevelTheme(getLevelFromScore(run.score)).name}) &bull; {run.tokens} tokens
                      </span>
                    </div>
                    <span className="CyberRunner__runDate">{run.date}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="CyberRunner__lifetimeRow">
              <div>
                <span>Lifetime Tokens</span>
                <strong>{stats.totalTokens.toLocaleString()}</strong>
              </div>
              <div>
                <span>Best Combo</span>
                <strong>{stats.bestStreak || 1}x</strong>
              </div>
              <div>
                {!confirmReset ? (
                  <button
                    type="button"
                    className="CyberRunner__resetBtn"
                    onClick={() => setConfirmReset(true)}
                  >
                    <FaTrashAlt /> Reset Local Scores
                  </button>
                ) : (
                  <div className="CyberRunner__confirmReset">
                    <button
                      type="button"
                      className="CyberRunner__confirmYes"
                      onClick={handleResetStats}
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      className="CyberRunner__confirmNo"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tech Rank Badges Card */}
          <div className="CyberRunner__panel">
            <div className="CyberRunner__panelHeader">
              <h3>
                <FaMedal className="CyberRunner__panelIconCyan" /> MSP Developer Milestones
              </h3>
              <span className="CyberRunner__gamesCount">
                {unlockedBadgesCount} / {TECH_BADGES.length} Unlocked
              </span>
            </div>

            <div className="CyberRunner__badgesList">
              {TECH_BADGES.map((badge) => {
                const unlocked = stats.highScore >= badge.threshold;
                return (
                  <div
                    key={badge.id}
                    className={`CyberRunner__badgeItem ${
                      unlocked ? 'is-unlocked' : 'is-locked'
                    }`}
                  >
                    <div
                      className="CyberRunner__badgeDot"
                      style={{
                        borderColor: unlocked ? badge.color : 'rgba(255,255,255,0.16)',
                        background: unlocked ? `${badge.color}22` : 'rgba(255,255,255,0.04)',
                        color: unlocked ? badge.color : '#6e85a3',
                      }}
                    >
                      <FaMedal />
                    </div>
                    <div className="CyberRunner__badgeText">
                      <div className="CyberRunner__badgeTitleRow">
                        <strong>{badge.title}</strong>
                        <span className="CyberRunner__badgeTarget">
                          {badge.threshold.toLocaleString()} pts
                        </span>
                      </div>
                      <p>{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CyberRunner;
