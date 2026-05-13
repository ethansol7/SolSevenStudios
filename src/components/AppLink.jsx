import { buildPath } from '../routing.js';

export default function AppLink({ children, className, onClick, onNavigate, to, ...props }) {
  const href = to.startsWith('http') ? to : buildPath(to);

  return (
    <a
      className={className}
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (to.startsWith('http')) return;
        onNavigate?.(event, to);
      }}
    >
      {children}
    </a>
  );
}
