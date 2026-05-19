interface Props {
  width?: number;
  className?: string;
}

export default function FordLogo({ width = 250, className = "" }: Props) {
  const height = Math.round(width * 0.36);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 265 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: "drop-shadow(0 0 24px rgba(0, 104, 214, 0.45))",
      }}
    >
      <ellipse cx="132.5" cy="48" rx="128" ry="44" stroke="#0068D6" strokeWidth="3" fill="none" />
      <ellipse cx="132.5" cy="48" rx="118" ry="36" stroke="#0068D6" strokeWidth="1.5" fill="none" opacity="0.5" />
      <text
        x="132.5"
        y="60"
        textAnchor="middle"
        fill="white"
        fontFamily="'Chakra Petch', sans-serif"
        fontSize="42"
        fontWeight="700"
        letterSpacing="8"
      >
        FORD
      </text>
    </svg>
  );
}
