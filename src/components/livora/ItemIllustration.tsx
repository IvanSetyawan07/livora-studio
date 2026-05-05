import sofaLobby from "../../assets/harmony/sofa-putih.png";
import sofaWhite from "../../assets/harmony/Sofa-panjang.png";

interface Props {
  name: string;
  size?: number;
  strokeWidth?: number;
}

export const ItemIllustration = ({ name, size = 120, strokeWidth = 1.25 }: Props) => {
  const stroke = "#C9A97A";
  const common = {
    viewBox: "0 0 120 120",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: size,
    height: size,
    "aria-label": name,
  };

  switch (name) {
    case "Accent Chair":
      return (
        <svg {...common}>
          <path d="M40 50c0-10 6-18 20-18s20 8 20 18v22H40z" />
          <path d="M40 60h40" />
          <path d="M44 72v18M76 72v18" />
        </svg>
      );
    case "Lounge Sofa":
  return (
    <img 
  src={sofaLobby}
  alt="Lounge Sofa"
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain"
  }}
/>
  );
    case "Ottoman":
      return (
        <svg {...common}>
          <rect x="32" y="56" width="56" height="22" rx="3" />
          <path d="M38 78v10M82 78v10" />
        </svg>
      );
    case "Side Table":
      return (
        <svg {...common}>
          <path d="M36 50h48" />
          <path d="M44 50v40M76 50v40" />
          <path d="M40 90h40" />
        </svg>
      );
    case "Floor Lamp":
      return (
        <svg {...common}>
          <path d="M48 30l24 6-8 22H56z" />
          <path d="M60 58v36" />
          <path d="M50 94h20" />
        </svg>
      );
    case "Sectional Sofa":
      return (
        <svg {...common}>
          <path d="M22 58c0-5 3-8 8-8h28v32H22z" />
          <path d="M58 66h32c5 0 8 3 8 8v8H58z" />
          <path d="M26 82v8M94 82v8" />
        </svg>
      );
    case "Sofa Three Bench":
      return (
        <img 
  src={sofaWhite}
  alt="Sofa Three Bench"
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain"
  }}
/>
      );
    case "Console Table":
      return (
        <svg {...common}>
          <path d="M22 52h76" />
          <path d="M30 52v40M90 52v40" />
          <path d="M22 64h76" />
        </svg>
      );
    case "Dining Table":
      return (
        <svg {...common}>
          <path d="M20 54h80" />
          <path d="M28 54v36M92 54v36" />
        </svg>
      );
    case "Pendant Light":
      return (
        <svg {...common}>
          <path d="M60 22v18" />
          <path d="M44 40h32l-6 22H50z" />
          <path d="M52 62v6M68 62v6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="30" y="44" width="60" height="32" rx="3" />
        </svg>
      );
  }
};
