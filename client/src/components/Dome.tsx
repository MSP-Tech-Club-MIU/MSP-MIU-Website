import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useGesture } from 'react-use-gesture';
import './Dome.css';
import ApiService from '../services/api';
import useSiteContent from '../hooks/useSiteContent';

const DEFAULTS = {
  maxVerticalRotationDeg: 90,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 20 
};

// Optimized utility functions
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360;
const wrapAngleSigned = (deg: number) => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-6, -3, 0, 3, 6];  // Increased vertical spread
  const oddYs = [-4.5, -1.5, 1.5, 4.5, 7.5];  // Increased vertical spread

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2.5 }));  // Increased sizeY from 2 to 2.5 for taller images
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }
  if (pool.length > totalSlots) {
    console.warn(
      `[DomeGallery] Provided image count (${pool.length}) exceeds available tiles (${totalSlots}). Some images will not be shown.`
    );
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, alt: '' };
    }
    return { src: image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export default function DomeGallery({
  images,
  fit = 0.8,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = '#060010',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  imageBorderRadius = '30px',
  grayscale = false
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef(null);
  const lastDragEndAt = useRef(0);

  // State for images from cloud API
  const [cloudImages, setCloudImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const { data: galleryContent } = useSiteContent(['gallery'], {
    gallery: { title: 'Gallery', subtitle: 'Moments from our journey together' }
  });
  const gallery = galleryContent.gallery || { title: 'Gallery', subtitle: 'Moments from our journey together' };

  // Fetch images from cloud API
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        setImagesError(null);
        const result = await ApiService.getImages({ limit: 100, page: 1 });
        const imageData = Array.isArray(result) ? result : (result.images || result.data || []);
        // Extract URLs from image objects (API returns {url, key, name, ...})
        const imageUrls = imageData.map((img: { url: string }) => img.url);
        setCloudImages(imageUrls);
      } catch (error) {
        console.error('Failed to load images from cloud API:', error);
        setImagesError(error instanceof Error ? error.message : 'Failed to load images');
        setCloudImages([]); // Fallback to empty array
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Use provided images prop if available, otherwise use cloud images
  const displayImages = images || cloudImages;

  const items = useMemo(() => buildItems(displayImages, segments), [displayImages, segments]);
  
  // Lazy loading: Track which images should be loaded
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const applyTransform = (xDeg, yDeg) => {
    const el = sphereRef.current;
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  };

  const lockedRadiusRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;
      let basis;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    overlayBlurColor,
    grayscale,
    imageBorderRadius
  ]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
  }, []);

  // Intersection Observer for lazy loading images
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setVisibleItems((prev) => new Set([...prev, index]));
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    );

    itemRefs.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      itemRefs.current.forEach((element) => {
        if (element) observer.unobserve(element);
      });
    };
  }, [items.length]);

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current) {
      cancelAnimationFrame(inertiaRAF.current);
      inertiaRAF.current = null;
    }
  }, []);

  const startInertia = useCallback(
    (vx, vy) => {
      const MAX_V = 1.4;
      let vX = clamp(vx, -MAX_V, MAX_V) * 80;
      let vY = clamp(vy, -MAX_V, MAX_V) * 80;
      let frames = 0;
      const d = clamp(dragDampening ?? 0.6, 0, 1);
      const frictionMul = 0.94 + 0.055 * d;
      const stopThreshold = 0.015 - 0.01 * d;
      const maxFrames = Math.round(90 + 270 * d);
      const step = () => {
        vX *= frictionMul;
        vY *= frictionMul;
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null;
          return;
        }
        const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200);
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        inertiaRAF.current = requestAnimationFrame(step);
      };
      stopInertia();
      inertiaRAF.current = requestAnimationFrame(step);
    },
    [dragDampening, maxVerticalRotationDeg, stopInertia]
  );

  const bind =   useGesture(
    {
      onDragStart: (state: any) => {
        stopInertia();
        const evt = state.event as MouseEvent | TouchEvent;
        if (!evt) return;
        const clientX = 'touches' in evt ? evt.touches[0]?.clientX : evt.clientX;
        const clientY = 'touches' in evt ? evt.touches[0]?.clientY : evt.clientY;
        if (clientX === undefined || clientY === undefined) return;
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: clientX, y: clientY };
      },
      onDrag: (state: any) => {
        if (!draggingRef.current || !startPosRef.current) return;
        const evt = state.event as MouseEvent | TouchEvent;
        if (!evt) return;
        const clientX = 'touches' in evt ? evt.touches[0]?.clientX : evt.clientX;
        const clientY = 'touches' in evt ? evt.touches[0]?.clientY : evt.clientY;
        if (clientX === undefined || clientY === undefined) return;
        const dxTotal = clientX - startPosRef.current.x;
        const dyTotal = clientY - startPosRef.current.y;
        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
          if (dist2 > 16) movedRef.current = true;
        }
        const nextX = clamp(
          startRotRef.current.x - dyTotal / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        const nextY = wrapAngleSigned(startRotRef.current.y + dxTotal / dragSensitivity);
        if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
          rotationRef.current = { x: nextX, y: nextY };
          applyTransform(nextX, nextY);
        }
        if (state.last) {
          draggingRef.current = false;
          const vel = Array.isArray(state.velocity) ? state.velocity : [0, 0];
          const dir = Array.isArray(state.direction) ? state.direction : [0, 0];
          let [vMagX, vMagY] = vel;
          const [dirX, dirY] = dir;
          let vx = vMagX * dirX;
          let vy = vMagY * dirY;
          if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(state.movement)) {
            const [mx, my] = state.movement;
            vx = clamp((mx / dragSensitivity) * 0.02, -1.2, 1.2);
            vy = clamp((my / dragSensitivity) * 0.02, -1.2, 1.2);
          }
          if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) startInertia(vx, vy);
          if (movedRef.current) lastDragEndAt.current = performance.now();
          movedRef.current = false;
        }
      }
    },
    { eventOptions: { passive: true } }
  );



  useEffect(() => {
    return () => {
      document.body.classList.remove('dg-scroll-lock');
    };
  }, []);

  return (
    <div className="DomeGallery">
    <div className="DomeGallery__head">
          <h2 className="DomeGallery__title">{gallery.title || 'Gallery'}</h2>
          <p className="DomeGallery__subtitle">{gallery.subtitle || 'Moments from our journey together'}</p>
        </div>
    <div
      ref={rootRef}
      className="sphere-root"
      style={{
        ['--segments-x']: segments,
        ['--segments-y']: segments,
        ['--overlay-blur-color']: overlayBlurColor,
        ['--tile-radius']: imageBorderRadius,
        ['--image-filter']: grayscale ? 'grayscale(1)' : 'none'
      }}
    >
      <main ref={mainRef} {...bind()} className="sphere-main">
        <div className="stage">
          <div ref={sphereRef} className="sphere">
            {items.map((it, i) => {
              const shouldLoad = visibleItems.has(i) || i < 10; // Load first 10 immediately
              return (
                <div
                  key={`${it.x},${it.y},${i}`}
                  ref={(el) => {
                    if (el) itemRefs.current.set(i, el);
                  }}
                  data-index={i}
                  className="item"
                  data-src={it.src}
                  data-offset-x={it.x}
                  data-offset-y={it.y}
                  data-size-x={it.sizeX}
                  data-size-y={it.sizeY}
                  style={{
                    ['--offset-x']: it.x,
                    ['--offset-y']: it.y,
                    ['--item-size-x']: it.sizeX,
                    ['--item-size-y']: it.sizeY
                  }}
                >
                  <div
                    className="item__image"
                    aria-label={it.alt || 'Image'}
                  >
                    {shouldLoad ? (
                      <img 
                        src={it.src} 
                        draggable={false} 
                        alt={it.alt}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label="Loading image..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overlay" />
        <div className="overlay overlay--blur" />
        <div className="edge-fade edge-fade--top" />
          <div className="edge-fade edge-fade--bottom" />
        </main>
      </div>
    </div>
  );
}
