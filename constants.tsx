import React from "react";
import {
  Construction,
  Truck,
  Filter,
  Wrench,
  Clock,
  LogOut,
  Search,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Sun,
  Moon,
  Settings,
  Check,
  MoreVertical,
  Eye,
  EyeOff,
  Sparkles,
  Paperclip,
  Bell,
  QrCode,
  Globe,
  Download,
  Upload,
  Camera,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  FileText,
  Menu,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react";

// Custom byPrefixAndName helper object for the exact syntax you requested
// Now using Lucide React icons instead of FontAwesome
const byPrefixAndName = {
  fas: {
    excavator: Construction, // Using Construction icon for excavator
    tractor: Truck,
    truck: Truck,
    filter: Filter,
    wrench: Wrench,
    clock: Clock,
    logout: LogOut,
    search: Search,
    plus: Plus,
    edit: Edit,
    trash: Trash2,
    back: ArrowLeft,
    sun: Sun,
    moon: Moon,
    settings: Settings,
    check: Check,
    menu: MoreVertical,
    eye: Eye,
    eyeOff: EyeOff,
    sparkles: Sparkles,
    paperclip: Paperclip,
    bell: Bell,
    qrcode: QrCode,
    globe: Globe,
    download: Download,
    upload: Upload,
    camera: Camera,
    checkCircle: CheckCircle,
    xCircle: XCircle,
    info: Info,
    chart: BarChart3,
    document: FileText,
  },
  fal: {
    excavator: Construction, // Same as solid for light variant
    tractor: Truck,
  },
};

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
    <path
      fillRule="evenodd"
      d="M9.344 3.071a.75.75 0 0 1 1.06 0l1.125 1.125a.75.75 0 0 1 0 1.06l-1.125 1.125a.75.75 0 0 1-1.06 0L8.22 5.256a.75.75 0 0 1 0-1.06L9.344 3.07Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M14.656 3.071a.75.75 0 0 1 1.06 0L16.84 4.19a.75.75 0 0 1 0 1.061l-1.125 1.125a.75.75 0 0 1-1.06 0L13.53 5.256a.75.75 0 0 1 0-1.06l1.125-1.125Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M18.75 9.344a.75.75 0 0 1 0 1.06l-1.125 1.125a.75.75 0 0 1-1.06 0l-1.125-1.125a.75.75 0 0 1 0-1.06l1.125-1.125a.75.75 0 0 1 1.06 0L18.75 9.344Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M18.75 14.656a.75.75 0 0 1 0 1.06l-1.125 1.125a.75.75 0 0 1-1.06 0L15.44 15.72a.75.75 0 0 1 0-1.061l1.125-1.125a.75.75 0 0 1 1.06 0l1.125 1.125Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M14.656 19.879a.75.75 0 0 1-1.06 0l-1.125-1.125a.75.75 0 0 1 0-1.06l1.125-1.125a.75.75 0 0 1 1.06 0l1.125 1.125a.75.75 0 0 1 0 1.06l-1.125 1.125Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M9.344 19.879a.75.75 0 0 1-1.06 0l-1.125-1.125a.75.75 0 0 1 0-1.06l1.125-1.125a.75.75 0 0 1 1.06 0l1.125 1.125a.75.75 0 0 1 0 1.06L9.344 19.88Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M5.25 14.656a.75.75 0 0 1 0-1.06l1.125-1.125a.75.75 0 0 1 1.06 0l1.125 1.125a.75.75 0 0 1 0 1.06l-1.125 1.125a.75.75 0 0 1-1.06 0L5.25 14.656Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M5.25 9.344a.75.75 0 0 1 0-1.06l1.125-1.125a.75.75 0 0 1 1.06 0L8.56 8.28a.75.75 0 0 1 0 1.061l-1.125 1.125a.75.75 0 0 1-1.06 0L5.25 9.344Z"
      clipRule="evenodd"
    />
  </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Menu;
  return <IconComponent className={className} />;
};

export const Squares2x2Icon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = LayoutGrid;
  return <IconComponent className={className} />;
};

export const TruckIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Truck;
  return <IconComponent className={className} />;
};

export const ExcavatorIcon: React.FC<{ className?: string }> = ({
  className,
}) => (
  // Custom SVG excavator icon for accurate heavy machinery representation
  <svg
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 624.93 500.11"
    fill="currentColor"
    className={className}
  >
    <g id="b">
      <path d="M556.18,362.61h-18.75v-25h43.75c3.46,0,6.25-2.79,6.25-6.25v-75c0-3.46-2.79-6.25-6.25-6.25h-131.25v-56.24c0-8.35-3.25-16.2-9.15-22.11-5.91-5.9-13.75-9.14-22.08-9.14h-.02l-102.84.06c-.21,0-.38.13-.58.15-21.27-23.25-126.33-138.15-133.13-146.4C168.4-.21,155.22-.1,137.18.14c-4.94.06-10.45.12-16.7-.13-8.56-.23-12.99,3.26-15.49,6.3-5.51,6.7-5.2,16.65-4.47,22.25-6.51,20.02-50.96,163.35-61.29,201.26l.13.04c-.88,2.65-1.45,5.42-1.56,8.34-15.51,4.09-37.8,16.86-37.8,44.25s0,71.45,58.39,84.47c7.24,1.61,14.26,2.41,21,2.41,15.39,0,29.32-4.16,41.01-12.38,16.69-11.72,27.53-31.13,30.53-54.65.23-1.81-.34-3.64-1.57-4.98-1.22-1.35-2.99-2.09-4.8-2.06-2.11,0-46.03.71-57.13-32.7,4.31-3.62,7.57-8.37,9.35-13.84l.13.06,59.13-128.74,95.64,151.42c-1.05,3.13-1.76,6.42-1.76,9.9v50c0,3.46,2.8,6.25,6.25,6.25h43.75v25h-6.25c-37.9,0-68.75,30.85-68.75,68.75s30.85,68.75,68.75,68.75h262.5c37.9,0,68.75-30.85,68.75-68.75s-30.85-68.75-68.75-68.75h0ZM137.36,307.58c-3.57,16.86-11.99,30.59-24.15,39.14-13.87,9.73-31.86,12.51-52.12,7.99-44.93-10.02-48.6-38.66-48.6-72.27,0-21.09,18.11-29.1,27.39-31.83,4.48,11.19,15.38,19.14,28.15,19.14,2.94,0,5.73-.55,8.43-1.34,10.66,28.17,40.68,37.74,60.9,39.17h0ZM94.32,224.48c-5.23-9.17-14.99-15.45-26.28-15.45-3.68,0-7.17.76-10.44,1.96,14.1-48.15,40.54-133.03,50.91-166.2l39.56,62.64-53.76,117.04h0ZM150.4,50.35c-5.89,0-10.67-4.77-10.67-10.67s4.78-10.67,10.67-10.67,10.67,4.78,10.67,10.67-4.77,10.67-10.67,10.67ZM319.23,175.18l99.44-.06h.02c4.99,0,9.71,1.95,13.25,5.49s5.49,8.25,5.49,13.26v56.24h-155.24c4.73-13.79,15.79-41.78,37.04-74.93h0ZM312.43,337.61h212.5v25h-212.5v-25ZM556.18,487.61h-262.5c-31.02,0-56.25-25.23-56.25-56.25s25.23-56.25,56.25-56.25h262.5c31.02,0,56.25,25.23,56.25,56.25s-25.23,56.25-56.25,56.25h0ZM331.18,431.36c0,20.71-16.79,37.5-37.5,37.5s-37.5-16.79-37.5-37.5,16.79-37.5,37.5-37.5,37.5,16.79,37.5,37.5ZM462.43,431.36c0,20.71-16.79,37.5-37.5,37.5s-37.5-16.79-37.5-37.5,16.79-37.5,37.5-37.5,37.5,16.79,37.5,37.5ZM593.68,431.36c0,20.71-16.79,37.5-37.5,37.5s-37.5-16.79-37.5-37.5,16.79-37.5,37.5-37.5,37.5,16.79,37.5,37.5Z" />
    </g>
  </svg>
);

export const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 376.16 376.16"
    fill="currentColor"
    className={className}
  >
    <g>
      <path
        className="cls-3"
        d="M174.36,20.01c38.05-2.29,93.71,6.8,118.51,38.71,14.29,18.4,12.99,52.32,4.08,72.88-2.25,49.56,3.05,101.85.05,151.1-.81,13.24-7.02,24.95-13.82,36.04-30.45,49.7-142.44,48.52-182.34,10.47-9.49-9.05-21.45-32.02-22.38-45.08-3.5-49.37,2.59-102.74.01-152.53-7.46-14.85-8.92-46.33-2.78-61.4,13.55-33.25,66.09-48.23,98.66-50.19ZM180.23,41.28c-22.99,1.41-67.47,13.21-70.24,41.22-3.66,37,53.43,49.43,81.05,48.79,23.4-.55,71-12.42,74.32-40.81,4.56-38.96-56.6-50.95-85.13-49.2Z"
      />
      <path
        className="cls-2"
        d="M180.23,41.28c28.53-1.75,89.69,10.24,85.13,49.2-3.32,28.38-50.92,40.26-74.32,40.81-27.62.64-84.71-11.79-81.05-48.79,2.77-28.01,47.25-39.81,70.24-41.22ZM194.83,50.8c-3.34-4-16.78-2.72-15.07,3.66s21.08,3.54,15.07-3.66ZM146.5,58.09c-10.68,1.05-9.15,10.94,3.47,9.39,9.6-1.18,6.2-10.34-3.47-9.39ZM226.43,58.09c-7.9.78-9.24,8.13-1.64,9.33,15.17,2.4,13.93-10.54,1.64-9.33ZM181.7,69.88c-30.95,3.36-29.24,30.22,1.26,32.77,9.57.8,31.45-2.41,33.3-14.33,2.48-15.99-23.27-19.66-34.56-18.44ZM128.12,81.57c-7.64,1.4-6.48,8.68,1.3,9.36,13.34,1.16,12.57-11.9-1.3-9.36ZM241.78,81.57c-8.62,1.43-6.26,8.7,1.3,9.36,13.12,1.15,12.14-11.59-1.3-9.36ZM143.51,105.01c-1.53.34-4.08,2.31-4.22,3.92-.58,6.4,17.77,7.84,16.19-.76-.68-3.71-9.14-3.79-11.97-3.16ZM224.18,105.02c-1.55.31-3.91,1.51-4.22,3.14-1.72,9.02,19.17,6.9,15.79-.36-1.61-3.45-8.36-3.42-11.57-2.78ZM194.85,121.54c6.37-6.66-13.24-10.66-15.1-3.68-1.66,6.25,11.41,7.53,15.1,3.68Z"
      />
    </g>
  </svg>
);

export const WrenchIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Wrench;
  return <IconComponent className={className} />;
};

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Clock;
  return <IconComponent className={className} />;
};

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = LogOut;
  return <IconComponent className={className} />;
};

export const SearchIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = Search;
  return <IconComponent className={className} />;
};

export const PlusIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = Plus;
  return <IconComponent className={className} />;
};

export const PencilIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = Edit;
  return <IconComponent className={className} />;
};

export const TrashIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = Trash2;
  return <IconComponent className={className} />;
};

export const BackIcon: React.FC<{ className?: string }> = ({
  className = "h-5 w-5",
}) => {
  const IconComponent = ArrowLeft;
  return <IconComponent className={className} />;
};

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Sun;
  return <IconComponent className={className} />;
};

export const MoonIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Moon;
  return <IconComponent className={className} />;
};

export const SettingsIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = Settings;
  return <IconComponent className={className} />;
};

export const CheckIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Check;
  return <IconComponent className={className} />;
};

export const EllipsisVerticalIcon: React.FC<{ className?: string }> = ({
  className = "h-5 w-5",
}) => {
  const IconComponent = MoreVertical;
  return <IconComponent className={className} />;
};

export const EyeIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = Eye;
  return <IconComponent className={className} />;
};

export const EyeSlashIcon: React.FC<{ className?: string }> = ({
  className = "h-4 w-4",
}) => {
  const IconComponent = EyeOff;
  return <IconComponent className={className} />;
};

export const SparklesIcon: React.FC<{ className?: string }> = ({
  className = "h-5 w-5",
}) => {
  const IconComponent = Sparkles;
  return <IconComponent className={className} />;
};

export const PaperClipIcon: React.FC<{ className?: string }> = ({
  className = "h-5 w-5",
}) => {
  const IconComponent = Paperclip;
  return <IconComponent className={className} />;
};

export const BellIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Bell;
  return <IconComponent className={className} />;
};

export const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = QrCode;
  return <IconComponent className={className} />;
};

export const GlobeAltIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = Globe;
  return <IconComponent className={className} />;
};

export const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = Download;
  return <IconComponent className={className} />;
};

export const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = Upload;
  return <IconComponent className={className} />;
};

export const CameraIcon: React.FC<{ className?: string }> = ({ className }) => {
  const IconComponent = Camera;
  return <IconComponent className={className} />;
};

export const CheckCircleIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = CheckCircle;
  return <IconComponent className={className} />;
};

export const XCircleIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = XCircle;
  return <IconComponent className={className} />;
};

export const InformationCircleIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = Info;
  return <IconComponent className={className} />;
};

export const ChartBarIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = BarChart3;
  return <IconComponent className={className} />;
};

export const DocumentTextIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = FileText;
  return <IconComponent className={className} />;
};

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className={className}
  >
    <defs>
      <linearGradient id="googleBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285f4" />
        <stop offset="100%" stopColor="#1976d2" />
      </linearGradient>
      <linearGradient id="googleRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ea4335" />
        <stop offset="100%" stopColor="#d23333" />
      </linearGradient>
      <linearGradient id="googleYellow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbc04" />
        <stop offset="100%" stopColor="#f9ab00" />
      </linearGradient>
      <linearGradient id="googleGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34a853" />
        <stop offset="100%" stopColor="#0f9d58" />
      </linearGradient>
    </defs>
    <path
      fill="url(#googleYellow)"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="url(#googleRed)"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="url(#googleGreen)"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.222,0-9.655-3.417-11.297-7.938l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="url(#googleBlue)"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238 C42.02,35.636,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <circle
      cx="24"
      cy="24"
      r="20"
      fill="none"
      stroke="rgba(0,0,0,0.05)"
      strokeWidth="0.5"
    />
  </svg>
);

export const ExclamationTriangleIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  const IconComponent = AlertTriangle;
  return <IconComponent className={className} />;
};
