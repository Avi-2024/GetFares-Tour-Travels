import { Component, type ChangeEvent } from "react";

type SearchDropdownOption = {
  label: string;
  value: string;
};

interface SearchDropDownProps {
  value: string;
  options: SearchDropdownOption[];
  placeholder: string;
  searchValue: string;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onChange: (value: string) => void;
}

class SearchDropDown extends Component<SearchDropDownProps> {
  private handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.props.onSearchChange(event.target.value);
  };

  private handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    this.props.onChange(event.target.value);
  };

  render() {
    const { value, options, placeholder, searchValue, disabled = false } =
      this.props;
    const className =
      "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

    return (
      <div className="space-y-2">
        <input
          type="search"
          value={searchValue}
          onChange={this.handleSearchChange}
          className={className}
          placeholder={placeholder}
          disabled={disabled}
        />
        <select
          value={value}
          onChange={this.handleSelectChange}
          className={className}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}

export type { SearchDropdownOption };
export default SearchDropDown;
