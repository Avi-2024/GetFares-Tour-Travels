import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaAnchor,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaBath,
  FaBed,
  FaBell,
  FaBicycle,
  FaBinoculars,
  FaBolt,
  FaBreadSlice,
  FaBriefcase,
  FaBuilding,
  FaBus,
  FaCalendar,
  FaCampground,
  FaCar,
  FaCarrot,
  FaCamera,
  FaCheese,
  FaCheck,
  FaCheckCircle,
  FaChurch,
  FaCity,
  FaClock,
  FaCloud,
  FaCocktail,
  FaCoffee,
  FaComments,
  FaCompass,
  FaConciergeBell,
  FaCreditCard,
  FaDoorOpen,
  FaDumbbell,
  FaEgg,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaFile,
  FaFilter,
  FaFire,
  FaFish,
  FaFlag,
  FaGift,
  FaGlassMartiniAlt,
  FaGlobe,
  FaGlobeAmericas,
  FaGlobeAsia,
  FaGlobeEurope,
  FaHandshake,
  FaHeart,
  FaHelicopter,
  FaHiking,
  FaHome,
  FaHotel,
  FaHourglass,
  FaIceCream,
  FaImage,
  FaInfoCircle,
  FaKey,
  FaLandmark,
  FaLanguage,
  FaLeaf,
  FaLink,
  FaList,
  FaLocationArrow,
  FaLuggageCart,
  FaMap,
  FaMapMarkedAlt,
  FaMapPin,
  FaMapSigns,
  FaMedal,
  FaMicrophone,
  FaMoneyBillWave,
  FaMoon,
  FaMotorcycle,
  FaMugHot,
  FaMusic,
  FaPalette,
  FaParking,
  FaPassport,
  FaPepperHot,
  FaPercent,
  FaPhone,
  FaPizzaSlice,
  FaPlane,
  FaPlaneArrival,
  FaPlaneDeparture,
  FaPlay,
  FaPlus,
  FaReceipt,
  FaRoad,
  FaRoute,
  FaSearch,
  FaSearchLocation,
  FaShieldAlt,
  FaShip,
  FaShoppingBag,
  FaShoppingCart,
  FaShuttleVan,
  FaSnowflake,
  FaSnowman,
  FaSpa,
  FaSpinner,
  FaStar,
  FaSuitcaseRolling,
  FaSun,
  FaSubway,
  FaSwimmingPool,
  FaTag,
  FaTags,
  FaTaxi,
  FaTimes,
  FaTractor,
  FaTrain,
  FaTree,
  FaTrophy,
  FaTv,
  FaTicketAlt,
  FaUmbrella,
  FaUmbrellaBeach,
  FaUser,
  FaUsers,
  FaUtensils,
  FaWallet,
  FaWater,
  FaWaveSquare,
  FaWifi,
  FaWineGlass,
  FaAppleAlt,
  FaBacon,
  FaBeer,
  FaBiking,
  FaBlender,
  FaCandyCane,
  FaCaravan,
  FaCarSide,
  FaCookie,
  FaCookieBite,
  FaDrumstickBite,
  FaGlassCheers,
  FaGlassWhiskey,
  FaHamburger,
  FaHotdog,
  FaHouseUser,
  FaLemon,
  FaMountain,
  FaMonument,
  FaPersonBooth,
  FaRocket,
  FaRunning,
  FaSeedling,
  FaSkiing,
  FaSnowboarding,
  FaSpaceShuttle,
  FaSwimmer,
  FaTrailer,
  FaTruckPickup,
  FaWalking,
  FaWineBottle,
} from "react-icons/fa";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type IconOption = {
  key: string;
  label: string;
  icon: IconType;
};

const iconOptions: IconOption[] = [
  { key: "home", label: "Home", icon: FaHome },
  { key: "bed", label: "Bed", icon: FaBed },
  { key: "map-pin", label: "Map Pin", icon: FaMapPin },
  { key: "map", label: "Map", icon: FaMap },
  { key: "map-marked-alt", label: "Map Marked", icon: FaMapMarkedAlt },
  { key: "compass", label: "Compass", icon: FaCompass },
  { key: "globe", label: "Globe", icon: FaGlobe },
  { key: "location-arrow", label: "Navigation", icon: FaLocationArrow },
  { key: "calendar", label: "Calendar", icon: FaCalendar },
  { key: "clock", label: "Clock", icon: FaClock },
  { key: "hourglass", label: "Timer", icon: FaHourglass },
  { key: "alarm-clock", label: "Alarm", icon: FaClock },
  { key: "sun", label: "Sun", icon: FaSun },
  { key: "moon", label: "Moon", icon: FaMoon },
  { key: "cloud", label: "Cloud", icon: FaCloud },
  { key: "wave-square", label: "Waves", icon: FaWaveSquare },
  //{ key: "droplet", label: "Droplets", icon: FaDroplet },
  { key: "umbrella", label: "Umbrella", icon: FaUmbrella },
  { key: "fire", label: "Flame", icon: FaFire },
  //{ key: "sparkles", label: "Sparkles", icon: FaSparkles },
  { key: "star", label: "Star", icon: FaStar },
  { key: "heart", label: "Heart", icon: FaHeart },
  //{ key: "diamond", label: "Diamond", icon: FaDiamond },
  { key: "check-circle", label: "Badge Check", icon: FaCheckCircle },
  { key: "medal", label: "Medal", icon: FaMedal },
  { key: "trophy", label: "Trophy", icon: FaTrophy },
  //{ key: "ticket", label: "Ticket", icon: FaTicket },
  { key: "gift", label: "Gift", icon: FaGift },
  //{ key: "bag-shopping", label: "Shopping Bag", icon: FaBagShopping },
  { key: "wallet", label: "Wallet", icon: FaWallet },
  { key: "credit-card", label: "Credit Card", icon: FaCreditCard },
  //{ key: "circle-dollar", label: "Dollar", icon: FaCircleDollarSign },
  { key: "plane", label: "Plane", icon: FaPlane },
  { key: "plane-departure", label: "Plane Departure", icon: FaPlaneDeparture },
  { key: "bus", label: "Bus", icon: FaBus },
  { key: "train", label: "Train", icon: FaTrain },
  { key: "car", label: "Car", icon: FaCar },
  { key: "bicycle", label: "Bike", icon: FaBicycle },
  { key: "shuttle-van", label: "Shuttle Van", icon: FaShuttleVan },
  { key: "suitcase-rolling", label: "Suitcase", icon: FaSuitcaseRolling },
  { key: "anchor", label: "Anchor", icon: FaAnchor },
  { key: "ship", label: "Ship", icon: FaShip },
  { key: "camera", label: "Camera", icon: FaCamera },
  { key: "image", label: "Image", icon: FaImage },
  { key: "music", label: "Music", icon: FaMusic },
  { key: "play", label: "Play", icon: FaPlay },
  { key: "microphone", label: "Mic", icon: FaMicrophone },
  { key: "phone", label: "Phone", icon: FaPhone },
  { key: "comments", label: "Message", icon: FaComments },
  { key: "users", label: "Users", icon: FaUsers },
  { key: "user", label: "User", icon: FaUser },
  { key: "briefcase", label: "Briefcase", icon: FaBriefcase },
  { key: "landmark", label: "Landmark", icon: FaLandmark },
  { key: "handshake", label: "Handshake", icon: FaHandshake },
  //{ key: "shield", label: "Shield", icon: FaShield },
  { key: "shield-alt", label: "Shield Alt", icon: FaShieldAlt },
  //{ key: "circle-info", label: "Help", icon: FaCircleInfo },
  //{ key: "triangle-exclamation", label: "Alert", icon: FaTriangleExclamation },
  { key: "wifi", label: "Wifi", icon: FaWifi },
  { key: "filter", label: "Filter", icon: FaFilter },
  { key: "list", label: "List", icon: FaList },
  //{ key: "list-check", label: "Checklist", icon: FaListCheck },
  { key: "file", label: "File", icon: FaFile },
  { key: "link", label: "Link", icon: FaLink },
  //{ key: "magnifying-glass", label: "Search", icon: FaMagnifyingGlass },
  //{ key: "location-dot", label: "Locate", icon: FaLocationDot },
  { key: "spinner", label: "Loader", icon: FaSpinner },
  { key: "palette", label: "Palette", icon: FaPalette },
  { key: "bell", label: "Bell", icon: FaBell },
  { key: "bolt", label: "Zap", icon: FaBolt },
  { key: "arrow-up", label: "Arrow Up", icon: FaArrowUp },
  { key: "arrow-right", label: "Arrow Right", icon: FaArrowRight },
  { key: "arrow-down", label: "Arrow Down", icon: FaArrowDown },
  { key: "arrow-left", label: "Arrow Left", icon: FaArrowLeft },
  { key: "plus", label: "Plus", icon: FaPlus },
  { key: "check", label: "Check", icon: FaCheck },
  { key: "utensils", label: "Utensils", icon: FaUtensils },
  // Hotel
  { key: "hotel", label: "Hotel", icon: FaHotel },
  { key: "swimming-pool", label: "Pool", icon: FaSwimmingPool },
  { key: "spa", label: "Spa", icon: FaSpa },
  { key: "dumbbell", label: "Gym", icon: FaDumbbell },
  { key: "parking", label: "Parking", icon: FaParking },
  { key: "concierge-bell", label: "Concierge", icon: FaConciergeBell },
  { key: "snowflake", label: "AC", icon: FaSnowflake },
  { key: "tv", label: "TV", icon: FaTv },
  { key: "bath", label: "Bath", icon: FaBath },
  { key: "key", label: "Key", icon: FaKey },
  { key: "door-open", label: "Room", icon: FaDoorOpen },
  { key: "building", label: "Building", icon: FaBuilding },
  { key: "city", label: "City", icon: FaCity },
  // Food & Drink
  { key: "cocktail", label: "Cocktail", icon: FaCocktail },
  { key: "coffee", label: "Coffee", icon: FaCoffee },
  { key: "mug-hot", label: "Hot Drink", icon: FaMugHot },
  { key: "wine-glass", label: "Wine", icon: FaWineGlass },
  { key: "glass-martini", label: "Bar", icon: FaGlassMartiniAlt },
  { key: "pizza-slice", label: "Pizza", icon: FaPizzaSlice },
  { key: "hamburger", label: "Burger", icon: FaHamburger },
  { key: "ice-cream", label: "Ice Cream", icon: FaIceCream },
  { key: "cheese", label: "Cheese", icon: FaCheese },
  { key: "apple-alt", label: "Fruit", icon: FaAppleAlt },
  { key: "carrot", label: "Vegetable", icon: FaCarrot },
  { key: "bread-slice", label: "Bread", icon: FaBreadSlice },
  { key: "fish", label: "Fish", icon: FaFish },
  { key: "egg", label: "Egg", icon: FaEgg },
  { key: "leaf", label: "Veg", icon: FaLeaf },
  { key: "pepper-hot", label: "Spicy", icon: FaPepperHot },
  { key: "bacon", label: "Bacon", icon: FaBacon },
  { key: "hotdog", label: "Hotdog", icon: FaHotdog },
  { key: "drumstick", label: "Chicken", icon: FaDrumstickBite },
  { key: "lemon", label: "Lemon", icon: FaLemon },
  { key: "seedling", label: "Seedling", icon: FaSeedling },
  { key: "cookie", label: "Cookie", icon: FaCookie },
  { key: "cookie-bite", label: "Cookie Bite", icon: FaCookieBite },
  { key: "candy-cane", label: "Candy", icon: FaCandyCane },
  { key: "beer", label: "Beer", icon: FaBeer },
  { key: "wine-bottle", label: "Wine Bottle", icon: FaWineBottle },
  { key: "glass-whiskey", label: "Whiskey", icon: FaGlassWhiskey },
  { key: "glass-cheers", label: "Cheers", icon: FaGlassCheers },
  { key: "blender", label: "Blender", icon: FaBlender },
  // Travel
  { key: "plane-arrival", label: "Arrival", icon: FaPlaneArrival },
  { key: "passport", label: "Passport", icon: FaPassport },
  { key: "ticket-alt", label: "Ticket", icon: FaTicketAlt },
  { key: "luggage-cart", label: "Luggage", icon: FaLuggageCart },
  { key: "motorcycle", label: "Motorcycle", icon: FaMotorcycle },
  { key: "helicopter", label: "Helicopter", icon: FaHelicopter },
  { key: "subway", label: "Subway", icon: FaSubway },
  { key: "taxi", label: "Taxi", icon: FaTaxi },
  { key: "road", label: "Road", icon: FaRoad },
  { key: "route", label: "Route", icon: FaRoute },
  { key: "map-signs", label: "Directions", icon: FaMapSigns },
  { key: "search-location", label: "Find Place", icon: FaSearchLocation },
  { key: "flag", label: "Flag", icon: FaFlag },
  { key: "tractor", label: "Tractor", icon: FaTractor },
  { key: "car-side", label: "Car Side", icon: FaCarSide },
  { key: "truck-pickup", label: "Pickup Truck", icon: FaTruckPickup },
  { key: "caravan", label: "Caravan", icon: FaCaravan },
  { key: "trailer", label: "Trailer", icon: FaTrailer },
  { key: "rocket", label: "Rocket", icon: FaRocket },
  { key: "space-shuttle", label: "Space Shuttle", icon: FaSpaceShuttle },
  { key: "walking", label: "Walking", icon: FaWalking },
  { key: "running", label: "Running", icon: FaRunning },
  { key: "biking", label: "Biking", icon: FaBiking },
  { key: "swimmer", label: "Swimming", icon: FaSwimmer },
  { key: "skiing", label: "Skiing", icon: FaSkiing },
  { key: "snowboarding", label: "Snowboarding", icon: FaSnowboarding },
  { key: "house-user", label: "Homestay", icon: FaHouseUser },
  { key: "person-booth", label: "Booth", icon: FaPersonBooth },
  // Nature & Destinations
  { key: "mountain", label: "Mountain", icon: FaMountain },
  { key: "umbrella-beach", label: "Beach", icon: FaUmbrellaBeach },
  { key: "campground", label: "Camping", icon: FaCampground },
  { key: "tree", label: "Forest", icon: FaTree },
  { key: "water", label: "Water", icon: FaWater },
  { key: "snowman", label: "Snow", icon: FaSnowman },
  { key: "hiking", label: "Hiking", icon: FaHiking },
  { key: "binoculars", label: "Sightseeing", icon: FaBinoculars },
  { key: "church", label: "Church", icon: FaChurch },
  { key: "monument", label: "Monument", icon: FaMonument },
  // Deals & Pricing
  { key: "percent", label: "Discount", icon: FaPercent },
  { key: "tag", label: "Tag", icon: FaTag },
  { key: "tags", label: "Tags", icon: FaTags },
  { key: "receipt", label: "Receipt", icon: FaReceipt },
  { key: "money-bill-wave", label: "Payment", icon: FaMoneyBillWave },
  { key: "exchange-alt", label: "Exchange", icon: FaExchangeAlt },
  { key: "shopping-bag", label: "Shopping Bag", icon: FaShoppingBag },
  { key: "shopping-cart", label: "Cart", icon: FaShoppingCart },
  // Info & Global
  { key: "info-circle", label: "Info", icon: FaInfoCircle },
  { key: "exclamation-triangle", label: "Alert", icon: FaExclamationTriangle },
  { key: "search", label: "Search", icon: FaSearch },
  { key: "language", label: "Language", icon: FaLanguage },
  { key: "globe-americas", label: "Americas", icon: FaGlobeAmericas },
  { key: "globe-asia", label: "Asia", icon: FaGlobeAsia },
  { key: "globe-europe", label: "Europe", icon: FaGlobeEurope },
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
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-3 text-sm normal-case tracking-normal text-(--text-primary) transition hover:border-(--primary)/35 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-(--background-soft) text-(--text-secondary)">
            {selectedOption ?
              <selectedOption.icon size={14} />
            : <FaPlus size={14} />}
          </span>
          <span>{selectedOption ? selectedOption.label : "Add Icon"}</span>
        </button>
        {selectedOption && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-(--danger)"
            aria-label="Clear icon"
          >
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/45 p-3 sm:p-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-(--border) bg-(--surface) shadow-[0_36px_110px_color-mix(in_srgb,var(--text-primary)_22%,transparent)]">
            <div className="flex items-center justify-between border-b border-(--border) px-4 pb-4 pt-8 sm:px-6">
              <h3 className="text-base font-semibold text-(--text-primary)">
                Choose Icon
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--text-secondary)"
              >
                <FaTimes size={16} />
              </button>
            </div>
            <div className="border-b border-(--border) px-4 py-3 sm:px-6">
              <label className="relative block">
                <FaCamera
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search icon..."
                  className="h-10 w-full rounded-xl border border-(--border) bg-(--surface) pl-9 pr-3 text-sm text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring)"
                />
              </label>
            </div>
            <div className="max-h-[56vh] overflow-y-auto px-4 py-4 sm:px-6">
              {filteredOptions.length === 0 ?
                <p className="rounded-xl border border-(--border) bg-(--background-soft)/30 px-3 py-5 text-center text-sm text-(--text-secondary)">
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
                            "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-(--primary)"
                          : "border-(--border) bg-(--surface) text-(--text-secondary) hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:text-(--text-primary)"
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
