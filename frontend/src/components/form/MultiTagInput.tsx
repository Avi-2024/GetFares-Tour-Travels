import { useState } from "react";
import { FaXmark } from "react-icons/fa6";
import { FieldWrapper } from "./common";

type Props = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

const MultiTagInput = ({ label, value, onChange, required, error, placeholder = "Type and press Enter" }: Props) => {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const tag = draft.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div className={`rounded-xl border p-3 ${error ? "border-red-500" : "border-gray-200 dark:border-gray-700"}`}>
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {tag}
              <button type="button" className="ml-1" onClick={() => onChange(value.filter((current) => current !== tag))}>
                <FaXmark />
              </button>
            </span>
          ))}
        </div>
        <input
          className="field-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag();
            }
          }}
        />
      </div>
    </FieldWrapper>
  );
};

export default MultiTagInput;
