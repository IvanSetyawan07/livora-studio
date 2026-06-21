
import sofaLong__asset from "../../assets/harmony/long-sofa.png.asset.json";

const sofaLong = sofaLong__asset.url;
import chairLeather__asset from "../../assets/harmony/chair.png.asset.json";
const chairLeather = chairLeather__asset.url;
import chairCotton__asset from "../../assets/harmony/cotton-chair.png.asset.json";
const chairCotton = chairCotton__asset.url;
import sideTableImg__asset from "../../assets/harmony/table.png.asset.json";
const sideTableImg = sideTableImg__asset.url;
import modularSofaImg__asset from "../../assets/harmony/lobby-long-sofa.png.asset.json";
const modularSofaImg = modularSofaImg__asset.url;
import boucleSofaImg__asset from "../../assets/harmony/lobby-white-sofa.png.asset.json";
const boucleSofaImg = boucleSofaImg__asset.url;
import coffeeTableImg__asset from "../../assets/harmony/lobby-coffee-table.png.asset.json";
const coffeeTableImg = coffeeTableImg__asset.url;
import curvedOttomanImg__asset from "../../assets/harmony/lobby-ottoman.png.asset.json";
const curvedOttomanImg = curvedOttomanImg__asset.url;
import loungeBoucleSofaImg__asset from "../../assets/harmony/lounge-boucle-sofa.png.asset.json";
const loungeBoucleSofaImg = loungeBoucleSofaImg__asset.url;
import loungeLeatherChairImg__asset from "../../assets/harmony/lounge-leather-chair.png.asset.json";
const loungeLeatherChairImg = loungeLeatherChairImg__asset.url;
import loungeMarbleTableImg__asset from "../../assets/harmony/lounge-marble-table.png.asset.json";
const loungeMarbleTableImg = loungeMarbleTableImg__asset.url;
import suiteGreenChairImg__asset from "../../assets/harmony/suite-green-chair.png.asset.json";
const suiteGreenChairImg = suiteGreenChairImg__asset.url;
import suiteBrassTableImg__asset from "../../assets/harmony/suite-brass-table.png.asset.json";
const suiteBrassTableImg = suiteBrassTableImg__asset.url;
import freyjaSofaImg__asset from "../../assets/cihampelas/freyja-sofa.png.asset.json";
const freyjaSofaImg = freyjaSofaImg__asset.url;
import dwarfSofaImg__asset from "../../assets/cihampelas/dwarf-sofa.png.asset.json";
const dwarfSofaImg = dwarfSofaImg__asset.url;
import modularSectionalSofaImg__asset from "../../assets/am-house/living-room/modular-sectional-sofa.png.asset.json";
const modularSectionalSofaImg = modularSectionalSofaImg__asset.url;
import woodenLoungeChairImg__asset from "../../assets/am-house/living-room/wooden-lounge-chair.png.asset.json";
const woodenLoungeChairImg = woodenLoungeChairImg__asset.url;
import nestingCoffeeTablesImg__asset from "../../assets/am-house/living-room/nesting-coffee-tables.png.asset.json";
const nestingCoffeeTablesImg = nestingCoffeeTablesImg__asset.url;
import tanLeatherSwivelChairImg__asset from "../../assets/am-house/living-room/tan-leather-swivel-chair.png.asset.json";
const tanLeatherSwivelChairImg = tanLeatherSwivelChairImg__asset.url;
import pleatedDiningChairImg__asset from "../../assets/am-house/living-room/pleated-dining-chair.png.asset.json";
const pleatedDiningChairImg = pleatedDiningChairImg__asset.url;
import sageModularSectionalSofaImg__asset from "../../assets/am-house/living-room/sage-modular-sectional-sofa.png.asset.json";
const sageModularSectionalSofaImg = sageModularSectionalSofaImg__asset.url;
import cocoChair__asset from "../../assets/am-house/working-room/chair2.png.asset.json";
const cocoChair = cocoChair__asset.url;
import workChair__asset from "../../assets/am-house/working-room/kursikerja.png.asset.json";
const workChair = workChair__asset.url;
import cocoTable__asset from "../../assets/am-house/working-room/table2.png.asset.json";
const cocoTable = cocoTable__asset.url;
import whiteChair__asset from "../../assets/am-house/working-room/white-chair.png.asset.json";
const whiteChair = whiteChair__asset.url;
import whiteTable__asset from "../../assets/am-house/working-room/kursi3.png.asset.json";
const whiteTable = whiteTable__asset.url;
import lArmChair__asset from "../../assets/cihampelas/livingArea/LArm-chair.png.asset.json";
const lArmChair = lArmChair__asset.url;
import livingRoomTable__asset from "../../assets/cihampelas/livingArea/Living-room-table.png.asset.json";
const livingRoomTable = livingRoomTable__asset.url;
import threeSeatSofa__asset from "../../assets/cihampelas/livingArea/three-seater-sofa.png.asset.json";
const threeSeatSofa = threeSeatSofa__asset.url;
import valoraWingChair__asset from "../../assets/cihampelas/Valora Wing Chair.png.asset.json";
const valoraWingChair = valoraWingChair__asset.url;
import milanoSofa__asset from "../../assets/cihampelas/Milano Sofa.png.asset.json";
const milanoSofa = milanoSofa__asset.url;
import lunaraSwivelChair__asset from "../../assets/cihampelas/Lunara Swivel Chair.png.asset.json";
const lunaraSwivelChair = lunaraSwivelChair__asset.url;
import pedestalSideTable__asset from "../../assets/cihampelas/Pedestal Side Table.png.asset.json";
const pedestalSideTable = pedestalSideTable__asset.url;
import tubularCurvedSofa__asset from "../../assets/harmony/Tubular Curved Sofa.png.asset.json";
const tubularCurvedSofa = tubularCurvedSofa__asset.url;
import barrelChair__asset from "../../assets/harmony/Barrel Chair.png.asset.json";
const barrelChair = barrelChair__asset.url;
import executiveLoungeChair__asset from "../../assets/harmony/Executive Lounge Chair.png.asset.json";
const executiveLoungeChair = executiveLoungeChair__asset.url;
import swivelAccentChair__asset from "../../assets/harmony/Swivel Accent Chair.png.asset.json";
const swivelAccentChair = swivelAccentChair__asset.url;
import consoleTableImg from "../../assets/items/console-table.jpg";
import diningTableImg from "../../assets/items/dining-table.jpg";
import floorLampImg from "../../assets/items/floor-lamp.jpg";
import pendantLightImg from "../../assets/items/pendant-light.jpg";

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
