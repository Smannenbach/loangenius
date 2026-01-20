import React from 'react';

/**
 * Animation wrapper components for smooth micro-interactions
 */

export function FadeIn({ children, delay = 0, duration = 300, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

export function SlideIn({ children, direction = 'left', delay = 0, duration = 300, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms = {
    left: 'translateX(-20px)',
    right: 'translateX(20px)',
    up: 'translateY(-20px)',
    down: 'translateY(20px)',
  };

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0)' : transforms[direction],
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ children, delay = 0, duration = 200, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

export function StaggeredList({ children, staggerDelay = 50 }) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={index * staggerDelay} key={index}>
          {child}
        </FadeIn>
      ))}
    </>
  );
}

// Number counter animation for stats
export function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const startTime = React.useRef(null);
  const startValue = React.useRef(0);

  React.useEffect(() => {
    startValue.current = displayValue;
    startTime.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (value - startValue.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = typeof value === 'number' && value >= 1000
    ? Math.round(displayValue).toLocaleString()
    : Math.round(displayValue);

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// Progress bar with animation
export function AnimatedProgress({ value, max = 100, className = '', color = 'blue' }) {
  const percentage = Math.min((value / max) * 100, 100);

  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${colors[color]} transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Pulse animation for live indicators
export function LiveIndicator({ active = true, className = '' }) {
  if (!active) return null;

  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

// Skeleton shimmer effect
export function Shimmer({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
      />
    </div>
  );
}
