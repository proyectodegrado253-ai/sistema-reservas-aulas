"use client";

import { useEffect, useRef, useState } from "react";

type ActionMenuItem = {
  label: string;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  ariaLabel?: string;
};

export default function ActionMenu({ items, ariaLabel = "Acciones adicionales" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="action-menu" ref={menuRef}>
      <button
        type="button"
        className="action-menu-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {open ? (
        <div className="action-menu-panel" role="menu" aria-label={ariaLabel}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`action-menu-item ${item.variant === "danger" ? "danger" : ""}`}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                setOpen(false);
              }}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
