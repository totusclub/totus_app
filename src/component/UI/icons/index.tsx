import React from 'react';
import GotoShopIcon from './gotoshop.tsx';
import CopyIcon from './copy.tsx';
import ProblemIcon from './problem.tsx';
import EditIcon from './edit.tsx';
import Birthday from './birthday.tsx';
import StarIcon from './star.tsx';
import RecommendedIcon from './recommended.tsx';
import LineArrowDownIcon from './lineArrowDown.tsx';
import LineArrowUpIcon from './lineArrowUp.tsx';
import BirdIcon from './bird.tsx';
import Partner2Icon from './partner2.tsx';
import Partner1Icon from './partner1.tsx';
import Partner3Icon from './partner3.tsx';
import RadioIcon from "./radioLogo.tsx";
import SendButtonIcon from "./sendButton.tsx";
import LogoAiIcon from "./logoAi.tsx";
import AiActionButton from "./aiActionButton.tsx";
import TotusIcon from './totus/TotusIcon';
import * as T from './totus/icons.generated';
import type { TotusIconDef } from './totus/icons.generated';

/**
 * Пиктограммы — из набора Totus (стиль C, ./totus), тот же набор, что на сайте.
 * Старое имя → иконка набора; где у имени разный смысл, добавлены отдельные имена
 * (tourists, from, dates, nights, themeDark, themeLight, helpSupport…).
 * Без пары в наборе пока остаются: copy, сортировка (recommended, sortRating, lineArrowDown/Up),
 * неиспользуемые gotoshop, problem, edit, birthday. Логотипы и птица — как были.
 */
const TOTUS: Record<string, TotusIconDef> = {
  HomeStackScreen: T.iconTabSearch,
  OrdersStackScreen: T.iconTabOrders,
  ChatStackScreen: T.iconPhone,
  AccountStackScreen: T.iconTabAccount,
  share: T.iconShare,
  back: T.iconBack,
  navigateBack: T.iconBack,
  logout: T.iconLogout,
  arrowRight: T.iconChevronRight,
  arrowDown: T.iconChevronDown,
  arrowUp: T.iconChevronUp,
  simpleArrow: T.iconChevronLeft,
  info: T.iconInfo,
  search: T.iconSearch,
  plus: T.iconPlus,
  minus: T.iconMinus,
  filters: T.iconFilter,
  star: T.iconStars,
  starFilled: T.iconStars,
  checkmark: T.iconCheck,
  review: T.iconReviews,
  plane: T.iconDeparture,
  from: T.iconFrom,
  support: T.iconChat,
  phone: T.iconPhone,
  order: T.iconTabOrders,
  faq: T.iconPolicy,
  user: T.iconUser,
  tourists: T.iconTourists,
  HelpCenterIcon: T.iconHelpSupport,
  helpSupport: T.iconHelpSupport,
  MyOrders: T.iconTabOrders,
  warning: T.iconWarning,
  document: T.iconDocVoucher,
  file: T.iconDocOffer,
  download: T.iconDownload,
  moon: T.iconThemeDark,
  sun: T.iconThemeLight,
  calendar: T.iconCalendar,
  dates: T.iconDates,
  nights: T.iconNights,
  close: T.iconClose,
};

interface AppIconProps {
  name: string | undefined;
  size: number;
  color: string;
  width?: number;
  height?: number;
  filled?: boolean;
  /** false — без оранжевой детали: иконка на оранжевом или цветном фоне. */
  accent?: boolean;
}
const AppIcon = ({ name, size = 24, color = 'black', filled, accent = true }: AppIconProps) => {
  if (name === 'heart' || name === 'FavoritesStackScreen') {
    // «В избранном» — залитое сердце цветом из пропса (красное), как раньше
    return filled
      ? <TotusIcon icon={T.iconFavoriteFilled} size={size} color={color} accentColor={color} />
      : <TotusIcon icon={T.iconFavorite} size={size} color={color} />;
  }
  const totus = name ? TOTUS[name] : undefined;
  if (totus) {
    // звёзды отеля: целиком цветом из пропса; starFilled — залита, star — контур
    if (name === 'star' || name === 'starFilled') {
      return <TotusIcon icon={totus} size={size} color={color} accent={false} filled={name === 'starFilled'} />;
    }
    return <TotusIcon icon={totus} size={size} color={color} accent={accent} />;
  }
  switch (name) {
    case 'VoiceAssistantStackScreen':
      return <BirdIcon color={color} size={size} />; // AI icon
    case 'gotoshop':
      return <GotoShopIcon color={color} size={size} />;
    case 'copy':
      return <CopyIcon color={color} size={size} />;
    case 'problem':
      return <ProblemIcon color={color} size={size} />;
    case 'edit':
      return <EditIcon color={color} size={size} />;
    case 'birthday':
      return <Birthday color={color} size={size} />;
    case 'sortRating': // сортировка «Высокий рейтинг» — пока прежняя иконка, как на сайте
      return <StarIcon color={color} size={size} />;
    case 'recommended':
      return <RecommendedIcon color={color} size={size} />;
    case 'lineArrowDown':
      return <LineArrowDownIcon color={color} size={size} />;
    case 'lineArrowUp':
      return <LineArrowUpIcon color={color} size={size} />;
    case 'bird':
      return <BirdIcon color={color} size={size} />;
    case 'partner1':
      return <Partner1Icon color={color} size={size} />;
    case 'partner2':
      return <Partner2Icon color={color} size={size} />;
    case 'partner3':
      return <Partner3Icon color={color} size={size} />;
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
