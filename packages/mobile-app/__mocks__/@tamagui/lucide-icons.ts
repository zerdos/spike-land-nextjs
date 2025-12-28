/**
 * Mock for @tamagui/lucide-icons
 */

import React from "react";
import { View } from "react-native";

// Create a mock icon component
const createIconMock = (name: string) => {
  const IconComponent = (props: any) => {
    return React.createElement(View, {
      testID: props.testID || `icon-${name}`,
      ...props,
    });
  };
  IconComponent.displayName = name;
  return IconComponent;
};

// Export commonly used icons
export const ChevronRight = createIconMock("ChevronRight");
export const ChevronLeft = createIconMock("ChevronLeft");
export const ChevronDown = createIconMock("ChevronDown");
export const ChevronUp = createIconMock("ChevronUp");
export const X = createIconMock("X");
export const Check = createIconMock("Check");
export const Plus = createIconMock("Plus");
export const Minus = createIconMock("Minus");
export const Search = createIconMock("Search");
export const Settings = createIconMock("Settings");
export const User = createIconMock("User");
export const Menu = createIconMock("Menu");
export const Home = createIconMock("Home");
export const Image = createIconMock("Image");
export const Camera = createIconMock("Camera");
export const Upload = createIconMock("Upload");
export const Download = createIconMock("Download");
export const Share = createIconMock("Share");
export const Heart = createIconMock("Heart");
export const Star = createIconMock("Star");
export const Bell = createIconMock("Bell");
export const Mail = createIconMock("Mail");
export const Lock = createIconMock("Lock");
export const Unlock = createIconMock("Unlock");
export const Eye = createIconMock("Eye");
export const EyeOff = createIconMock("EyeOff");
export const Edit = createIconMock("Edit");
export const Trash = createIconMock("Trash");
export const Save = createIconMock("Save");
export const Copy = createIconMock("Copy");
export const Clipboard = createIconMock("Clipboard");
export const ExternalLink = createIconMock("ExternalLink");
export const RefreshCw = createIconMock("RefreshCw");
export const Loader = createIconMock("Loader");
export const AlertCircle = createIconMock("AlertCircle");
export const AlertTriangle = createIconMock("AlertTriangle");
export const Info = createIconMock("Info");
export const HelpCircle = createIconMock("HelpCircle");
export const Calendar = createIconMock("Calendar");
export const Clock = createIconMock("Clock");
export const Filter = createIconMock("Filter");
export const Grid = createIconMock("Grid");
export const List = createIconMock("List");
export const MoreHorizontal = createIconMock("MoreHorizontal");
export const MoreVertical = createIconMock("MoreVertical");
export const ArrowLeft = createIconMock("ArrowLeft");
export const ArrowRight = createIconMock("ArrowRight");
export const ArrowUp = createIconMock("ArrowUp");
export const ArrowDown = createIconMock("ArrowDown");
export const LogOut = createIconMock("LogOut");
export const LogIn = createIconMock("LogIn");
export const Folder = createIconMock("Folder");
export const File = createIconMock("File");
export const FileText = createIconMock("FileText");
export const Gift = createIconMock("Gift");
export const Sparkles = createIconMock("Sparkles");
export const Zap = createIconMock("Zap");
export const Target = createIconMock("Target");
export const Award = createIconMock("Award");
export const Trophy = createIconMock("Trophy");
export const Coins = createIconMock("Coins");
export const CreditCard = createIconMock("CreditCard");
export const DollarSign = createIconMock("DollarSign");
export const Shield = createIconMock("Shield");
export const Key = createIconMock("Key");
export const Palette = createIconMock("Palette");
export const Moon = createIconMock("Moon");
export const Sun = createIconMock("Sun");
export const Globe = createIconMock("Globe");
export const Users = createIconMock("Users");
export const UserPlus = createIconMock("UserPlus");
export const MessageCircle = createIconMock("MessageCircle");
export const Send = createIconMock("Send");
export const Wand2 = createIconMock("Wand2");
export const Crop = createIconMock("Crop");
export const Move = createIconMock("Move");
export const ZoomIn = createIconMock("ZoomIn");
export const ZoomOut = createIconMock("ZoomOut");
export const RotateCw = createIconMock("RotateCw");
export const RotateCcw = createIconMock("RotateCcw");
export const FlipHorizontal = createIconMock("FlipHorizontal");
export const FlipVertical = createIconMock("FlipVertical");
export const Sliders = createIconMock("Sliders");
export const Contrast = createIconMock("Contrast");
export const Activity = createIconMock("Activity");
export const BarChart = createIconMock("BarChart");
export const PieChart = createIconMock("PieChart");
export const TrendingUp = createIconMock("TrendingUp");
export const TrendingDown = createIconMock("TrendingDown");

// Default export with all icons
export default {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Plus,
  Minus,
  Search,
  Settings,
  User,
  Menu,
  Home,
  Image,
  Camera,
  Upload,
  Download,
  Share,
  Heart,
  Star,
  Bell,
  Mail,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit,
  Trash,
  Save,
  Copy,
  Clipboard,
  ExternalLink,
  RefreshCw,
  Loader,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Calendar,
  Clock,
  Filter,
  Grid,
  List,
  MoreHorizontal,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LogOut,
  LogIn,
  Folder,
  File,
  FileText,
  Gift,
  Sparkles,
  Zap,
  Target,
  Award,
  Trophy,
  Coins,
  CreditCard,
  DollarSign,
  Shield,
  Key,
  Palette,
  Moon,
  Sun,
  Globe,
  Users,
  UserPlus,
  MessageCircle,
  Send,
  Wand2,
  Crop,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Contrast,
  Activity,
  BarChart,
  PieChart,
  TrendingUp,
  TrendingDown,
};
