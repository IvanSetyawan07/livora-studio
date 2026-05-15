
import sofaLong from "../../assets/harmony/long-sofa.png";
import chairLeather from "../../assets/harmony/chair.png";
import chairCotton from "../../assets/harmony/cotton-chair.png";
import sideTableImg from "../../assets/harmony/table.png";
import modularSofaImg from "../../assets/harmony/lobby-long-sofa.png";
import boucleSofaImg from "../../assets/harmony/lobby-white-sofa.png";
import coffeeTableImg from "../../assets/harmony/lobby-coffee-table.png";
import curvedOttomanImg from "../../assets/harmony/lobby-ottoman.png";
import loungeBoucleSofaImg from "../../assets/harmony/lounge-boucle-sofa.png";
import loungeLeatherChairImg from "../../assets/harmony/lounge-leather-chair.png";
import loungeMarbleTableImg from "../../assets/harmony/lounge-marble-table.png";
import suiteGreenChairImg from "../../assets/harmony/suite-green-chair.png";
import suiteBrassTableImg from "../../assets/harmony/suite-brass-table.png";
import freyjaSofaImg from "../../assets/cihampelas/freyja-sofa.png";
import dwarfSofaImg from "../../assets/cihampelas/dwarf-sofa.png";
import modularSectionalSofaImg from "../../assets/am-house/living-room/modular-sectional-sofa.png";
import woodenLoungeChairImg from "../../assets/am-house/living-room/wooden-lounge-chair.png";
import nestingCoffeeTablesImg from "../../assets/am-house/living-room/nesting-coffee-tables.png";

interface Props {
  name: string;
  size?: number;
  strokeWidth?: number;
}

const imgStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
};

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
      return <img src={chairLeather} alt="Accent Chair" style={imgStyle} />;
    case "Freyja Sofa":
      return <img src={freyjaSofaImg} alt="Freyja Sofa" style={imgStyle} />;
    case "Dwarf Sofa":
      return <img src={dwarfSofaImg} alt="Dwarf Sofa" style={imgStyle} />;
    case "Lounge Sofa":

      return <img src={sofaLong} alt="Lounge Sofa" style={imgStyle} />;
    case "Cozy Chair":
      return <img src={chairCotton} alt="Cozy Chair" style={imgStyle} />;
    case "Modular Sofa":
      return <img src={modularSofaImg} alt="Modular Sofa" style={imgStyle} />;
    case "Modular Sectional Sofa":
      return <img src={modularSectionalSofaImg} alt="Modular Sectional Sofa" style={imgStyle} />;
    case "Wooden Lounge Chair":
      return <img src={woodenLoungeChairImg} alt="Wooden Lounge Chair" style={imgStyle} />;
    case "Nesting Coffee Tables":
      return <img src={nestingCoffeeTablesImg} alt="Nesting Coffee Tables" style={imgStyle} />;
    case "Boucle Sofa":
      return <img src={boucleSofaImg} alt="Boucle Sofa" style={imgStyle} />;
    case "Coffee Table":
      return <img src={coffeeTableImg} alt="Coffee Table" style={imgStyle} />;
    case "Curved Ottoman":
      return <img src={curvedOttomanImg} alt="Curved Ottoman" style={imgStyle} />;
    case "Boucle Lounge Sofa":
      return <img src={loungeBoucleSofaImg} alt="Boucle Lounge Sofa" style={imgStyle} />;
    case "Leather Lounge Chair":
      return <img src={loungeLeatherChairImg} alt="Leather Lounge Chair" style={imgStyle} />;
    case "Marble Coffee Table":
      return <img src={loungeMarbleTableImg} alt="Marble Coffee Table" style={imgStyle} />;
    case "Olive Swivel Chair":
      return <img src={suiteGreenChairImg} alt="Olive Swivel Chair" style={imgStyle} />;
    case "Brass Drum Coffee Table":
      return <img src={suiteBrassTableImg} alt="Brass Drum Coffee Table" style={imgStyle} />;
    case "Side Table":
      return <img src={sideTableImg} alt="Side Table" style={imgStyle} />;
    case "Floor Lamp":
      return (
        <svg {...common}>
          <path d="M48 30l24 6-8 22H56z" />
          <path d="M60 58v36" />
          <path d="M50 94h20" />
        </svg>
      );
    case "Modular Sectional Sofa":
      return (
        <svg {...common}>
          <path d="M22 58c0-5 3-8 8-8h28v32H22z" />
          <path d="M58 66h32c5 0 8 3 8 8v8H58z" />
          <path d="M26 82v8M94 82v8" />
        </svg>
      );
    case "Sofa Three Bench":
      return <img src={sofaLong} alt="Sofa Three Bench" style={imgStyle} />;
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
