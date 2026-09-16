import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FIELD_FONT, blankAssetUrl, type BlankField, type BlankTemplate, type BlankValues } from "@/lib/blanks";

const PT_TO_PX = 96 / 72;

interface FieldProps {
  field: BlankField;
  value: string;
  readOnly?: boolean;
  onChange: (name: string, value: string) => void;
}

/** Matn sig'masa, shriftni kichraytiradi (chop etishda ham xuddi shunday qilinadi). */
const useFitText = (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>, baseSize: number, value: string) => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fs = baseSize;
    el.style.fontSize = `${fs}pt`;
    while ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && fs > 5) {
      fs -= 0.5;
      el.style.fontSize = `${fs}pt`;
    }
  }, [ref, baseSize, value]);
};

const FieldInput = memo(({ field, value, readOnly, onChange }: FieldProps) => {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useFitText(ref, field.fs, value);

  const style: React.CSSProperties = {
    left: `${field.x}pt`,
    top: `${field.y}pt`,
    width: `${field.w}pt`,
    height: `${field.h}pt`,
    fontSize: `${field.fs}pt`,
    fontFamily: FIELD_FONT,
  };
  const common = cn(
    "absolute m-0 border-0 bg-transparent text-[#0b2a6f] outline-none transition-colors",
    "placeholder:text-transparent focus:bg-sky-200/40 hover:bg-sky-100/40",
    !value && "bg-amber-100/30",
    readOnly && "pointer-events-none bg-transparent",
  );
  const title = field.label || undefined;

  if (field.kind === "cell") {
    return (
      <textarea
        ref={ref}
        data-field={field.name}
        className={cn(common, "resize-none overflow-hidden px-[2pt] py-[1pt] text-center leading-[1.05]")}
        style={style}
        value={value}
        title={title}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => onChange(field.name, e.target.value)}
      />
    );
  }
  return (
    <input
      ref={ref}
      data-field={field.name}
      className={cn(common, "px-[2pt] pb-[1pt] pt-0 leading-none")}
      style={style}
      value={value}
      title={title}
      readOnly={readOnly}
      spellCheck={false}
      autoComplete="off"
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  );
});
FieldInput.displayName = "FieldInput";

interface Props {
  template: BlankTemplate;
  values: BlankValues;
  onChange: (name: string, value: string) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Asl hujjatning aynan o'zi (SVG fon) + ustida to'ldiriladigan maydonlar.
 * Bir xil nomli maydonlar (bir nechta nusxa) bitta qiymatni ko'rsatadi.
 */
export const TwinBlank = ({ template, values, onChange, readOnly, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>
      {width > 0 &&
        template.pages.map((page, index) => {
          const pagePx = page.w * PT_TO_PX;
          const scale = Math.min(1.25, width / pagePx);
          return (
            <div
              key={page.src}
              className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-border"
              style={{ width: pagePx * scale, height: page.h * PT_TO_PX * scale }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{ width: `${page.w}pt`, height: `${page.h}pt`, transform: `scale(${scale})` }}
              >
                <img
                  src={blankAssetUrl(page.src)}
                  alt={`${template.title} — ${index + 1}-sahifa`}
                  className="absolute inset-0 h-full w-full select-none"
                  draggable={false}
                />
                {template.fields
                  .filter((f) => f.page === index)
                  .map((f, i) => (
                    <FieldInput
                      key={`${f.name}-${i}`}
                      field={f}
                      value={values[f.name] ?? ""}
                      readOnly={readOnly}
                      onChange={onChange}
                    />
                  ))}
              </div>
              {template.pages.length > 1 && (
                <span className="absolute bottom-1 right-2 rounded bg-muted/80 px-1.5 text-[10px] text-muted-foreground print:hidden">
                  {index + 1}/{template.pages.length}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default TwinBlank;
