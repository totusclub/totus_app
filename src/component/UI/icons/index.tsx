import React from 'react';
import SearchIcon from './search.tsx';
import CardIcon from './orders.tsx';
import ProfileIcon from './profile.tsx';
import ShareIcon from './share.tsx';
import GotoShopIcon from './gotoshop.tsx';
import CopyIcon from './copy.tsx';
import ProblemIcon from './problem.tsx';
import BackIcon from './back.tsx';
import EditIcon from './edit.tsx';
import LogoutIcon from './logout.tsx';
import InfoIcon from './info.tsx';
import NavigateBack from './navigateBack.tsx';
import Birthday from './birthday.tsx';
import ArrowRight from './arrowRight.tsx';
import ArrowDown from './arrowDown.tsx';
import PlusIcon from './plus.tsx';
import MinusIcon from './minus.tsx';
import HeartIcon from './heartIcon.tsx';
import SimpleArrowIcon from './simpleArrow.tsx';
import FiltersIcon from './filters.tsx';
import StarIcon from './star.tsx';
import StarFilledIcon from './starFilled.tsx';
import ArrowUp from './arrowUp.tsx';
import CheckmarkIcon from './checkmark.tsx';
import ReviewIcon from './review.tsx';
import RecommendedIcon from './recommended.tsx';
import LineArrowDownIcon from './lineArrowDown.tsx';
import LineArrowUpIcon from './lineArrowUp.tsx';
import PlaneIcon from './plane.tsx';
import BirdIcon from './bird.tsx';
import SupportIcon from './support.tsx';
import PhoneIcon from './phone.tsx';
import OrderIcon from './order.tsx';
import FaqIcon from './faq.tsx';
import UserIcon from './user.tsx';
import HelpCenterIcon from './helpCEnter.tsx';
import MyOrders from './myOrders.tsx';
import AccountIcon from './accont.tsx';
import OrdersIcon from './orders.tsx';
import WarningIcon from './warning.tsx';
import DocumentIcon from './document.tsx';
import FileIcon from './file.tsx';
import DownloadIcon from './download.tsx';
import PartnersIcon from './partner2.tsx';
import Partner2Icon from './partner2.tsx';
import Partner1Icon from './partner1.tsx';
import Partner3Icon from './partner3.tsx';
import MoonIcon from './moon.tsx';
import SunIcon from './sun.tsx';
import RadioIcon from "./radioLogo.tsx";
import SendButtonIcon from "./sendButton.tsx";
import LogoAiIcon from "./logoAi.tsx";
import AiActionButton from "./aiActionButton.tsx";

interface AppIconProps {
  name: string | undefined;
  size: number;
  color: string;
  width?: number;
  height?: number;
  filled?: boolean;
}
const AppIcon = ({ name, size = 24, width, height, color = 'black', filled }: AppIconProps) => {
  switch (name) {
    case 'HomeStackScreen':
      return <SearchIcon color={color} size={size} />;
    case 'OrdersStackScreen':
      return <OrdersIcon color={color} size={size} />;
    case 'ChatStackScreen':
      return <PhoneIcon color={color} size={size} />;
    case 'FavoritesStackScreen':
      return <HeartIcon color={color} size={size} filled={filled} />;
    case 'VoiceAssistantStackScreen':
      return <BirdIcon color={color} size={size} />; // AI icon
    case 'AccountStackScreen':
      return <AccountIcon color={color} size={size} />;
    case 'share'://share
      return <ShareIcon color={color} size={size} />;
    case 'gotoshop':
      return <GotoShopIcon color={color} size={size} />;
    case 'copy':
      return <CopyIcon color={color} size={size} />;
    case 'problem':
      return <ProblemIcon color={color} size={size} />;
    case 'back':
      return <BackIcon color={color} size={size} />;
    case 'edit':
      return <EditIcon color={color} size={size} />;
    case 'logout':
      return <LogoutIcon color={color} size={size} />;
    case 'navigateBack':
      return <NavigateBack color={color} size={size} />;
    case 'arrowRight':
      return <ArrowRight color={color} size={size} />;
    case 'arrowDown':
      return <ArrowDown color={color} size={size} />;
    case 'birthday':
      return <Birthday color={color} size={size} />;
    case 'info':
      return <InfoIcon color={color} size={size} />;
    case 'search':
      return <SearchIcon color={color} size={size} />;
    case 'plus':
      return <PlusIcon color={color} size={size} />;
    case 'minus':
      return <MinusIcon color={color} size={size} />;
    case 'heart':
      return <HeartIcon color={color} size={size} filled={filled} />;
    case 'simpleArrow':
      return <SimpleArrowIcon color={color} size={size} />;
    case 'filters':
      return <FiltersIcon color={color} size={size} />;
    case 'star':
      return <StarIcon color={color} size={size} />;
    case 'starFilled':
      return <StarFilledIcon color={color} size={size} />;
    case 'arrowUp':
      return <ArrowUp color={color} size={size} />;
    case 'checkmark':
      return <CheckmarkIcon color={color} size={size} />;
    case 'review':
      return <ReviewIcon color={color} size={size} />;
    case 'recommended':
      return <RecommendedIcon color={color} size={size} />;
    case 'lineArrowDown':
      return <LineArrowDownIcon color={color} size={size} />;
    case 'lineArrowUp':
      return <LineArrowUpIcon color={color} size={size} />;
    case 'plane':
      return <PlaneIcon color={color} size={size} />;
    case 'bird':
      return <BirdIcon color={color} size={size} />;
    case 'support':
      return <SupportIcon color={color} size={size} />;
    case 'phone':
      return <PhoneIcon color={color} size={size} />;
    case 'order':
      return <OrderIcon color={color} size={size} />;
    case 'faq':
      return <FaqIcon color={color} size={size} />;
    case 'user':
      return <UserIcon color={color} size={size} />;
    case 'HelpCenterIcon':
      return <HelpCenterIcon color={color} size={size} />;
    case 'MyOrders':
      return <MyOrders color={color} size={size} />;
    case 'warning':
      return <WarningIcon color={color} size={size} />;
    case 'document':
      return <DocumentIcon color={color} size={size} />;
    case 'file':
      return <FileIcon color={color} size={size} />;
    case 'download':
      return <DownloadIcon color={color} size={size} />;
    case 'partner1':
      return <Partner1Icon color={color} size={size} />;
    case 'partner2':
      return <Partner2Icon color={color} size={size} />;
    case 'partner3':
      return <Partner3Icon color={color} size={size} />;
    case 'moon':
      return <MoonIcon color={color} size={size} />;
    case 'sun':
      return <SunIcon color={color} size={size} />;
      case 'radiologo':
      return <RadioIcon color={color} size={size} />;
      case 'sendButton':
      return <SendButtonIcon color={color} size={size} />;
      case 'logoAi':
      return <LogoAiIcon color={color} size={size} />;
      case 'aiActionButton':
      return <AiActionButton color={color} size={size} />;

    default:
      return null;
  }
};

export default AppIcon;
