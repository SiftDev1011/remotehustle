"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Chevron } from "./chevron";

type Option = { value: string; label: string; disabled: boolean };

/** Keep the native select as the form/validation source of truth. */
export function Dropdown({
  children,
  className = "",
  onChange,
  onInvalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", at: 0 });
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState("");
  const [label, setLabel] = useState(props["aria-label"] || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const select = native.current!;
    setHost(document.getElementById("rh-search-discovery"));
    setOptions(
      Array.from(select.options, (option) => ({
        value: option.value,
        label: option.text,
        disabled:
          option.disabled ||
          (option.parentElement instanceof HTMLOptGroupElement &&
            option.parentElement.disabled),
      })),
    );
    setSelected(select.value);
    if (!props["aria-label"]) {
      const labels = Array.from(select.labels || [], (item) => {
        const copy = item.cloneNode(true) as HTMLElement;
        copy
          .querySelectorAll("select, button, [role=listbox]")
          .forEach((el) => el.remove());
        return copy.textContent?.trim();
      })
        .filter(Boolean)
        .join(" ");
      setLabel(
        labels || props.name?.replaceAll("_", " ") || "Choose an option",
      );
    }
  }, [
    children,
    props.value,
    props.defaultValue,
    props.name,
    props["aria-label"],
  ]);

  useEffect(() => {
    const form = native.current?.form;
    const reset = () =>
      requestAnimationFrame(() => {
        setSelected(native.current?.value || "");
        setOpen(false);
      });
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const height = viewport?.height || innerHeight;
      const width = viewport?.width || innerWidth;
      const below = top + height - rect.bottom - 16;
      const above = rect.top - top - 16;
      const upwards = below < 180 && above > below;
      setPosition({
        left: Math.max(12, Math.min(rect.left, width - rect.width - 12)),
        width: Math.min(rect.width, width - 24),
        top: upwards ? undefined : rect.bottom + 6,
        bottom: upwards ? innerHeight - rect.top + 6 : undefined,
        maxHeight: Math.max(80, Math.min(280, upwards ? above : below)),
      });
    };
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !popup.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function show() {
    if (native.current?.matches(":disabled")) return;
    const index = options.findIndex(
      (option) => option.value === native.current?.value && !option.disabled,
    );
    setActive(
      index >= 0 ? index : options.findIndex((option) => !option.disabled),
    );
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || native.current?.matches(":disabled"))
      return;
    const select = native.current!;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setSelected(select.value);
    setOpen(false);
    trigger.current?.focus();
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      if (open) event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        show();
        return;
      }
      const enabled = options
        .map((o, i) => (!o.disabled ? i : -1))
        .filter((i) => i >= 0);
      if (!enabled.length) return;
      const current = enabled.indexOf(active);
      setActive(
        event.key === "Home"
          ? enabled[0]
          : event.key === "End"
            ? enabled.at(-1)!
            : enabled[
                (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  enabled.length) %
                  enabled.length
              ],
      );
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      search.current = {
        text:
          (now - search.current.at < 650 ? search.current.text : "") +
          event.key.toLowerCase(),
        at: now,
      };
      const index = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLowerCase().startsWith(search.current.text),
      );
      if (!open) show();
      if (index >= 0) setActive(index);
    }
  }
  return (
    <span
      className={"app-dropdown " + className}
      data-enhanced={!!host}
      data-open={open}
    >
      <select
        {...props}
        ref={native}
        id={host && props.id ? props.id + "-native" : props.id}
        className="app-dropdown-native"
        tabIndex={host ? -1 : props.tabIndex}
        aria-hidden={host ? true : undefined}
        onFocus={() => host && trigger.current?.focus()}
        onChange={(event) => {
          setSelected(event.currentTarget.value);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          onInvalid?.(event);
          if (host) {
            event.preventDefault();
            trigger.current?.focus();
            show();
          }
        }}
      >
        {children}
      </select>
      {host && (
        <button
          ref={trigger}
          id={props.id}
          type="button"
          className="app-dropdown-trigger"
          role="combobox"
          aria-label={label}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          aria-expanded={open}
          aria-controls={id}
          aria-haspopup="listbox"
          aria-required={props.required}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          disabled={props.disabled}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={keydown}
          onBlur={() => setOpen(false)}
        >
          <span>
            {options.find((option) => option.value === selected)?.label ||
              "Choose an option"}
          </span>
          <Chevron />
        </button>
      )}
      {host &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="listbox"
            aria-label={label}
            className="app-dropdown-popup"
            data-open={open}
            style={position}
            inert={!open}
          >
            {options.map((option, index) => (
              <div
                key={`${index}-${option.value}`}
                id={`${id}-${index}`}
                role="option"
                aria-selected={option.value === selected}
                aria-disabled={option.disabled || undefined}
                data-index={index}
                data-active={index === active}
                className="app-dropdown-option"
                onPointerMove={() => !option.disabled && setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === selected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </div>
            ))}
            {!options.length && (
              <div className="app-dropdown-option">No options available</div>
            )}
          </div>,
          host,
        )}
    </span>
  );
}
