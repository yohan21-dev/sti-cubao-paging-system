export default function STILogo({ size = 56, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="STI College Cubao"
    >
      <rect width="100" height="100" rx="16" fill="#006837" />
      <text
        x="50" y="44"
        textAnchor="middle" dominantBaseline="middle"
        fill="#FDB813"
        fontSize="30" fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
      >STI</text>
      <text
        x="50" y="70"
        textAnchor="middle" dominantBaseline="middle"
        fill="#fff"
        fontSize="9" fontWeight="500"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="1"
      >CUBAO</text>
    </svg>
  );
}
