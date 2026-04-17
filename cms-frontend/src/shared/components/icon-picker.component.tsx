import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  Anchor,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bell,
  Bike,
  Briefcase,
  Bus,
  Calendar,
  Camera,
  Car,
  Check,
  CircleAlert,
  CircleDollarSign,
  CircleHelp,
  CircleOff,
  Clock3,
  Cloud,
  Compass,
  CreditCard,
  Diamond,
  Droplets,
  FileText,
  Filter,
  Flame,
  Gift,
  Globe,
  Handshake,
  Heart,
  Home,
  Hotel,
  ImageIcon,
  Info,
  Landmark,
  Link,
  List,
  ListChecks,
  LoaderCircle,
  LocateFixed,
  Map,
  MapPin,
  Medal,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Navigation,
  Palette,
  Phone,
  Plane,
  Play,
  Plus,
  Search,
  Shield,
  ShipWheel,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Ticket,
  Timer,
  Train,
  TriangleAlert,
  Trophy,
  Umbrella,
  User,
  Users,
  Wallet,
  Waves,
  Wifi,
  X,
  Zap,
} from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type IconOption = {
  key: string;
  label: string;
  icon: LucideIcon;
};

const iconOptions: IconOption[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "hotel", label: "Hotel", icon: Hotel },
  { key: "map-pin", label: "Map Pin", icon: MapPin },
  { key: "map", label: "Map", icon: Map },
  { key: "compass", label: "Compass", icon: Compass },
  { key: "globe", label: "Globe", icon: Globe },
  { key: "navigation", label: "Navigation", icon: Navigation },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "clock", label: "Clock", icon: Clock3 },
  { key: "timer", label: "Timer", icon: Timer },
  { key: "alarm", label: "Alarm", icon: AlarmClock },
  { key: "sun", label: "Sun", icon: Sun },
  { key: "moon", label: "Moon", icon: Moon },
  { key: "cloud", label: "Cloud", icon: Cloud },
  { key: "waves", label: "Waves", icon: Waves },
  { key: "droplets", label: "Droplets", icon: Droplets },
  { key: "umbrella", label: "Umbrella", icon: Umbrella },
  { key: "flame", label: "Flame", icon: Flame },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
  { key: "star", label: "Star", icon: Star },
  { key: "heart", label: "Heart", icon: Heart },
  { key: "diamond", label: "Diamond", icon: Diamond },
  { key: "badge-check", label: "Badge Check", icon: BadgeCheck },
  { key: "medal", label: "Medal", icon: Medal },
  { key: "trophy", label: "Trophy", icon: Trophy },
  { key: "ticket", label: "Ticket", icon: Ticket },
  { key: "gift", label: "Gift", icon: Gift },
  { key: "shopping-bag", label: "Shopping Bag", icon: ShoppingBag },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "credit-card", label: "Credit Card", icon: CreditCard },
  { key: "circle-dollar", label: "Dollar", icon: CircleDollarSign },
  { key: "plane", label: "Plane", icon: Plane },
  { key: "bus", label: "Bus", icon: Bus },
  { key: "train", label: "Train", icon: Train },
  { key: "car", label: "Car", icon: Car },
  { key: "bike", label: "Bike", icon: Bike },
  { key: "anchor", label: "Anchor", icon: Anchor },
  { key: "ship-wheel", label: "Ship Wheel", icon: ShipWheel },
  { key: "camera", label: "Camera", icon: Camera },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "music", label: "Music", icon: Music },
  { key: "play", label: "Play", icon: Play },
  { key: "mic", label: "Mic", icon: Mic },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "message-circle", label: "Message", icon: MessageCircle },
  { key: "users", label: "Users", icon: Users },
  { key: "user", label: "User", icon: User },
  { key: "briefcase", label: "Briefcase", icon: Briefcase },
  { key: "landmark", label: "Landmark", icon: Landmark },
  { key: "handshake", label: "Handshake", icon: Handshake },
  { key: "shield", label: "Shield", icon: Shield },
  { key: "circle-help", label: "Help", icon: CircleHelp },
  { key: "info", label: "Info", icon: Info },
  { key: "circle-alert", label: "Alert", icon: CircleAlert },
  { key: "triangle-alert", label: "Warning", icon: TriangleAlert },
  { key: "circle-off", label: "Off", icon: CircleOff },
  { key: "wifi", label: "Wifi", icon: Wifi },
  { key: "filter", label: "Filter", icon: Filter },
  { key: "list", label: "List", icon: List },
  { key: "list-checks", label: "Checklist", icon: ListChecks },
  { key: "file-text", label: "File", icon: FileText },
  { key: "link", label: "Link", icon: Link },
  { key: "search", label: "Search", icon: Search },
  { key: "locate-fixed", label: "Locate", icon: LocateFixed },
  { key: "loader", label: "Loader", icon: LoaderCircle },
  { key: "palette", label: "Palette", icon: Palette },
  { key: "bell", label: "Bell", icon: Bell },
  { key: "zap", label: "Zap", icon: Zap },
  { key: "arrow-up", label: "Arrow Up", icon: ArrowUp },
  { key: "arrow-right", label: "Arrow Right", icon: ArrowRight },
  { key: "arrow-down", label: "Arrow Down", icon: ArrowDown },
  { key: "arrow-left", label: "Arrow Left", icon: ArrowLeft },
  { key: "plus", label: "Plus", icon: Plus },
  { key: "check", label: "Check", icon: Check },
];

const IconPickerComponent = ({
  value,
  onChange,
  disabled = false,
}: IconPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => iconOptions.find((option) => option.key === value),
    [value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return iconOptions;
    }
    return iconOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.key.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-(--surface) px-3 text-sm text-[var(--text-primary)] transition hover:border-[var(--primary)]/35 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-(--background-soft) text-[var(--text-secondary)]">
            {selectedOption ?
              <selectedOption.icon size={14} />
            : <Plus size={14} />}
          </span>
          <span>{selectedOption ? selectedOption.label : "Add Icon"}</span>
        </button>
        {selectedOption && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
            aria-label="Clear icon"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-3 sm:p-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] bg-(--surface) shadow-[0_36px_110px_color-mix(in_srgb,var(--text-primary)_22%,transparent)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-6">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Choose Icon
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-(--surface) text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="border-b border-[var(--border)] px-4 py-3 sm:px-6">
              <label className="relative block">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search icon..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-(--surface) pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>
            </div>
            <div className="max-h-[56vh] overflow-y-auto px-4 py-4 sm:px-6">
              {filteredOptions.length === 0 ?
                <p className="rounded-xl border border-[var(--border)] bg-(--background-soft)/30 px-3 py-5 text-center text-sm text-[var(--text-secondary)]">
                  No icons found.
                </p>
              : <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {filteredOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = value === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          onChange(option.key);
                          setIsOpen(false);
                        }}
                        className={`inline-flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] transition ${
                          selected ?
                            "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]"
                          : "border-[var(--border)] bg-(--surface) text-[var(--text-secondary)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="line-clamp-1 w-full text-center">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IconPickerComponent;
