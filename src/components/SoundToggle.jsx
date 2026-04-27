import { Volume2, VolumeX } from 'lucide-react';

export default function SoundToggle({ enabled, onToggle }) {
  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <button className="sound-toggle" type="button" onClick={onToggle} aria-pressed={enabled} aria-label={enabled ? 'Disable sound' : 'Enable sound'}>
      <Icon size={18} strokeWidth={1.8} />
      <span>{enabled ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
