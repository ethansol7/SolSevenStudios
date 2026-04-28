import { buildPath } from '../routing.js';

export default function AppLink({ children, className, onNavigate, to, ...props }) {
  const href = to.startsWith('http') ? to : buildPath(to);

  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        if (to.startsWith('http')) return;
        onNavigate?.(event, to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
