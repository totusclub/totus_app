import AirConIcon from "./conditioner";
import AirportIcon from "./airport";
import AreaIcon from "./area";
import BarIcon from "./bar";
import BeachIcon from "./beach";
import BeachSizeIcon from "./beachSize";
import BeachSurfaceIcon from "./beachSurface";
import BeachTypeIcon from "./beachType";
import ConstructionIcon from "./construction";
import FitnessIcon from "./fitness";
import HeatedPoolIcon from "./heatedPool";
import IndoorPoolIcon from "./indoorPool";
import KidsMenuIcon from "./kidsMenu";
import KidsPoolIcon from "./kidsPoolIcon";
import LineIcon from "./line";
import MassageIcon from "./massage";
import NannyIcon from "./nanny";
import OnlyAdultsIcon from "./onlyAdults";
import ParkingIcon from "./parking";
import PoolIcon from "./pool";
import RenovationIcon from "./renovation";
import SafeIcon from "./safe";
import SkiInIcon from "./skiIn";
import SkiLiftIcon from "./skiLift";
import SkiOutIcon from "./skiOut";
import ThermalFunIcon from "./thermalFun";
import WifiIcon from "./wifi";
import TvIcon from "./tv";
import MiniBarIcon from "./mini-bar";
import TeaSetIcon from "./tea-set";
import CheckmarkIcon from "../checkmark";
import PhoneIcon from "./phone";
import CoffeeMachineIcon from "./coffeMachine";
import BalconyIcon from "./balcony";
import BathroomIcon from "./bathroom";
import ToiletIcon from "./toilet";
import ToiletryIcon from "./toiletry";
import LoungeIcon from "./lounge";
import ShowerIcon from "./shower";
import BathrobesIcon from "./bathrobes";
import CleaningIcon from "./cleaning";
import RoomServiceIcon from "./room-service";
import JacuzziIcon from "./jacuzzi";


interface AppIconProps {
  name: string | undefined;
  size: number;
  color: string;
  width?: number;
  height?: number;
}
const HotelIcons = ({ name, size = 24, width, height, color = 'black' }: AppIconProps) => {
  switch (name) {
    case 'airport':
      return <AirportIcon size={size} color={color} />;
    case 'construction':
      return <ConstructionIcon size={size} color={color} />;
    case 'renovation':
      return <RenovationIcon size={size} color={color} />;
    case 'beach':
      return <BeachIcon size={size} color={color} />;
    case 'beachSize':
      return <BeachSizeIcon size={size} color={color} />;
    case 'beachType':
      return <BeachTypeIcon size={size} color={color} />;
    case 'beachSurface':
      return <BeachSurfaceIcon size={size} color={color} />;
    case 'area':
      return <AreaIcon size={size} color={color} />;
    case 'line':
      return <LineIcon size={size} color={color} />;
    case 'wi-fi':
      return <WifiIcon size={size} color={color} />;
    case 'skiLift':
      return <SkiLiftIcon size={size} color={color} />;
    case 'sliIn':
      return <SkiInIcon size={size} color={color} />;
    case 'skiOut':
      return <SkiOutIcon size={size} color={color} />;
    case 'fitness':
      return <FitnessIcon size={size} color={color} />;
    case 'nanny':
      return <NannyIcon size={size} color={color} />;
    case 'kidsMenu':
      return <KidsMenuIcon size={size} color={color} />;
    case 'kidsPool':
      return <KidsPoolIcon size={size} color={color} />;
    case 'pool':
      return <PoolIcon size={size} color={color} />;
    case 'heatedPool':
      return <HeatedPoolIcon size={size} color={color} />;
    case 'conditioner':
      return <AirConIcon size={size} color={color} />;
    case 'parking':
      return <ParkingIcon size={size} color={color} />;
    case 'massage':
      return <MassageIcon size={size} color={color} />;
    case 'thermalFun':
      return <ThermalFunIcon size={size} color={color} />;
    case 'bar':
      return <BarIcon size={size} color={color} />;
    case 'indoorPool':
      return <IndoorPoolIcon size={size} color={color} />;
    case 'onlyAdults':
      return <OnlyAdultsIcon size={size} color={color} />;
    case 'safe':
      return <SafeIcon size={size} color={color} />;
    case 'tv':
      return <TvIcon size={size} color={color} />;
    case 'mini-bar':
      return <MiniBarIcon size={size} color={color} />;
    case 'tea-set':
      return <TeaSetIcon size={size} color={color} />;
    case 'phone':
      return <PhoneIcon color={color} size={size} />;
    case 'kitchen-appliances':
      return <CoffeeMachineIcon color={color} size={size} />;
    case 'balcony':
      return <BalconyIcon color={color} size={size} />;
    case 'bathroom':
      return <BathroomIcon color={color} size={size} />;
    case 'toilet':
      return <ToiletIcon color={color} size={size} />;
    case 'toiletry':
      return <ToiletryIcon color={color} size={size} />;
    case 'lounge':
      return <LoungeIcon color={color} size={size} />;
    case 'shower':
      return <ShowerIcon color={color} size={size} />;
    case 'bathrobes':
      return <BathrobesIcon color={color} size={size} />;
    case 'cleaning':
      return <CleaningIcon color={color} size={size} />;
    case 'room-service':
      return <RoomServiceIcon color={color} size={size} />;
    case 'jacuzzi':
      return <JacuzziIcon color={color} size={size} />;
    default:
      return <CheckmarkIcon color={color} size={size} />;
  }
};

export default HotelIcons;
