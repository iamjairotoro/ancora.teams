export default function TexBg({ children, className = '', minHeight }: {
  children: React.ReactNode
  className?: string
  minHeight?: string
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={minHeight ? { minHeight } : {}}>
      {/* Grid texture */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100%" height="100%" fill="#111111" />
        {/* Vertical lines */}
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={`v${i}`} x1={`${i * 35}`} y1="0" x2={`${i * 35}`} y2="100%"
            stroke="white" strokeWidth="0.3" opacity="0.07" />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${i * 22}`} x2="100%" y2={`${i * 22}`}
            stroke="white" strokeWidth="0.3" opacity="0.04" />
        ))}
        {/* Diagonal accent */}
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="0.5" opacity="0.025" />
        {/* Bottom fade */}
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#111" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#fade)" />
      </svg>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
