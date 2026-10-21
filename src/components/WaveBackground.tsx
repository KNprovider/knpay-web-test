export default function WaveBackground() {
  const champagne = "214, 208, 183"; // #D6D0B7

  const field = (alpha1: number, alpha2: number) =>
    `radial-gradient(ellipse at center, rgba(${champagne},${alpha1}) 0%, rgba(${champagne},${alpha2}) 45%, rgba(${champagne},0) 72%)`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -20,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: "#07161d",
      }}
    >
      {/* Champagne-felt til venstre */}
      <div
        style={{
          position: "absolute",
          left: "-12%",
          top: "22%",
          width: "42%",
          height: "62%",
          borderRadius: "50%",
          filter: "blur(40px)",
          background: field(0.9, 0.55),
        }}
      />

      {/* Champagne-felt til højre */}
      <div
        style={{
          position: "absolute",
          right: "-14%",
          top: "-10%",
          width: "50%",
          height: "90%",
          borderRadius: "50%",
          filter: "blur(40px)",
          background: field(0.9, 0.55),
        }}
      />

      {/* Turkise bølger */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="waveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00B4D8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#07161d" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M0 640 C 240 520, 420 760, 720 650 S 1220 520, 1440 620 L1440 900 L0 900 Z"
          fill="url(#waveFill)"
        />
        <path
          d="M0 640 C 240 520, 420 760, 720 650 S 1220 520, 1440 620"
          fill="none"
          stroke="url(#waveStroke)"
          strokeWidth="2"
        />
        <path
          d="M0 700 C 300 600, 500 820, 780 720 S 1240 620, 1440 700"
          fill="none"
          stroke="url(#waveStroke)"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <path
          d="M0 180 C 260 80, 520 260, 820 160 S 1260 60, 1440 140"
          fill="none"
          stroke="url(#waveStroke)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <path
          d="M0 260 C 300 180, 560 330, 860 240 S 1280 150, 1440 230"
          fill="none"
          stroke="url(#waveStroke)"
          strokeWidth="1"
          opacity="0.45"
        />
      </svg>
    </div>
  );
}
