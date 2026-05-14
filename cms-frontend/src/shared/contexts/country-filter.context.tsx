import { createContext, useContext, useState, type ReactNode } from "react";

interface CountryFilterContextValue {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
}

const CountryFilterContext = createContext<CountryFilterContextValue>({
  selectedCountry: "",
  setSelectedCountry: () => {},
});

const CountryFilterProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCountry, setSelectedCountry] = useState("");
  return (
    <CountryFilterContext.Provider value={{ selectedCountry, setSelectedCountry }}>
      {children}
    </CountryFilterContext.Provider>
  );
};

const useCountryFilter = () => useContext(CountryFilterContext);

export { CountryFilterProvider, useCountryFilter };
