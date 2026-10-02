
import sofaLong from "../../assets/harmony/long-sofa.webp";
import chairLeather from "../../assets/harmony/chair.webp";
import chairCotton from "../../assets/harmony/cotton-chair.webp";
import sideTableImg from "../../assets/harmony/table.webp";
import modularSofaImg from "../../assets/harmony/lobby-long-sofa.webp";
import boucleSofaImg from "../../assets/harmony/lobby-white-sofa.webp";
import coffeeTableImg from "../../assets/harmony/lobby-coffee-table.webp";
import curvedOttomanImg from "../../assets/harmony/lobby-ottoman.webp";
import loungeBoucleSofaImg from "../../assets/harmony/lounge-boucle-sofa.webp";
import loungeLeatherChairImg from "../../assets/harmony/lounge-leather-chair.webp";
import loungeMarbleTableImg from "../../assets/harmony/lounge-marble-table.webp";
import suiteGreenChairImg from "../../assets/harmony/suite-green-chair.webp";
import suiteBrassTableImg from "../../assets/harmony/suite-brass-table.webp";
import freyjaSofaImg from "../../assets/cihampelas/freyja-sofa.webp";
import dwarfSofaImg from "../../assets/cihampelas/dwarf-sofa.webp";
import modularSectionalSofaImg from "../../assets/am-house/living-room/modular-sectional-sofa.webp";
import woodenLoungeChairImg from "../../assets/am-house/living-room/wooden-lounge-chair.webp";
import nestingCoffeeTablesImg from "../../assets/am-house/living-room/nesting-coffee-tables.webp";
import tanLeatherSwivelChairImg from "../../assets/am-house/living-room/tan-leather-swivel-chair.webp";
import pleatedDiningChairImg from "../../assets/am-house/living-room/pleated-dining-chair.webp";
import sageModularSectionalSofaImg from "../../assets/am-house/living-room/sage-modular-sectional-sofa.webp";
import cocoChair from "../../assets/am-house/working-room/chair2.webp";
import workChair from "../../assets/am-house/working-room/kursikerja.webp";
import cocoTable from "../../assets/am-house/working-room/table2.webp";
import whiteChair from "../../assets/am-house/working-room/white-chair.webp";
import whiteTable from "../../assets/am-house/working-room/kursi3.webp";
import lArmChair from "../../assets/cihampelas/livingArea/LArm-chair.webp";
import livingRoomTable from "../../assets/cihampelas/livingArea/Living-room-table.webp";
import threeSeatSofa from "../../assets/cihampelas/livingArea/three-seater-sofa.webp";
import valoraWingChair from "../../assets/cihampelas/Valora Wing Chair.webp";
import milanoSofa from "../../assets/cihampelas/Milano Sofa.webp";
import lunaraSwivelChair from "../../assets/cihampelas/Lunara Swivel Chair.webp";
import pedestalSideTable from "../../assets/cihampelas/Pedestal Side Table.webp";
import tubularCurvedSofa from "../../assets/harmony/Tubular Curved Sofa.webp";
import barrelChair from "../../assets/harmony/Barrel Chair.webp";
import executiveLoungeChair from "../../assets/harmony/Executive Lounge Chair.webp";
import swivelAccentChair from "../../assets/harmony/Swivel Accent Chair.webp";
import consoleTableImg from "../../assets/items/console-table.webp";
import diningTableImg from "../../assets/items/dining-table.webp";
import floorLampImg from "../../assets/items/floor-lamp.webp";
import pendantLightImg from "../../assets/items/pendant-light.webp";

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
    case "Swivel Accent Chair":
      return <img src={swivelAccentChair} alt="Swivel Accent Chair" style={imgStyle} />;
    case "Executive Lounge Chair":
      return <img src={executiveLoungeChair} alt="Executive Lounge Chair" style={imgStyle} />;
    case "Barrel Chair":
      return <img src={barrelChair} alt="Barrel Chair" style={imgStyle} />;
    case "Pedestal Side Table":
      return <img src={pedestalSideTable} alt="Pedestal Side Table" style={imgStyle} />;
    case "Lunara Swivel Chair":
      return <img src={lunaraSwivelChair} alt="Lunara Swivel Chair" style={imgStyle} />;
    case "Milano Sofa":
      return <img src={milanoSofa} alt="Milano Sofa" style={imgStyle} />;
    case "Tubular Curved Sofa":
      return <img src={tubularCurvedSofa} alt="Tubular Curved Sofa" style={imgStyle} />;
    case "Valora Wing Chair":
      return <img src={valoraWingChair} alt="Valora Wing Chair" style={imgStyle} />;
    case "L-Arm Chair":
      return <img src={lArmChair} alt="L-Arm Chair" style={imgStyle} />;
    case "Living Room Table":
      return <img src={livingRoomTable} alt="Living Room Table" style={imgStyle} />;
    case "Three-Seat Sofa":
      return <img src={threeSeatSofa} alt="Three-Seat Sofa" style={imgStyle} />;
    case "White Table":
      return <img src={whiteTable} alt="White Table" style={imgStyle} />;
    case "Coco Chair":
      return <img src={cocoChair} alt="Coco Chair" style={imgStyle} />;
    case "Coco Table":
      return <img src={cocoTable} alt="Coco Table" style={imgStyle} />;
    case "White Chair":
      return <img src={whiteChair} alt="White Chair" style={imgStyle} />;
    case "Work Chair":
      return <img src={workChair} alt="Work Chair" style={imgStyle} />;
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
    case "Tan Leather Swivel Wingback Chair":
      return <img src={tanLeatherSwivelChairImg} alt="Tan Leather Swivel Wingback Chair" style={imgStyle} />;
    case "Pleated Dining Chair":
      return <img src={pleatedDiningChairImg} alt="Pleated Dining Chair" style={imgStyle} />;
    case "Sage Modular Sectional Sofa":
      return <img src={sageModularSectionalSofaImg} alt="Sage Modular Sectional Sofa" style={imgStyle} />;
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
      return <img src={floorLampImg} alt="Floor Lamp" style={imgStyle} />;
    case "Sofa Three Bench":
      return <img src={sofaLong} alt="Sofa Three Bench" style={imgStyle} />;
    case "Console Table":
      return <img src={consoleTableImg} alt="Console Table" style={imgStyle} />;
    case "Dining Table":
      return <img src={diningTableImg} alt="Dining Table" style={imgStyle} />;
    case "Pendant Light":
      return <img src={pendantLightImg} alt="Pendant Light" style={imgStyle} />;
    default:
      return (
        <svg {...common}>
          <rect x="30" y="44" width="60" height="32" rx="3" />
        </svg>
      );
  }
};
