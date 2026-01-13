import React from 'react';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
};

export default function ToggleSwitch({ checked, onChange, disabled, id }: Props) {
  return (
    <label className="toggle-switch" aria-label="Toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.currentTarget.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider" aria-hidden="true" />
    </label>
  );
}
