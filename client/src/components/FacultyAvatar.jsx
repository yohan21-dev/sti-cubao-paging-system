import STILogo from './STILogo.jsx';

const BASE = import.meta.env.VITE_API_URL || '';

export default function FacultyAvatar({ photo, name, size = 80 }) {
  if (!photo) {
    return <STILogo size={size} />;
  }
  return (
    <img
      src={`${BASE}${photo}`}
      alt={name}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid var(--sti-light)',
      }}
      onError={e => { e.currentTarget.style.display = 'none'; }}
    />
  );
}
