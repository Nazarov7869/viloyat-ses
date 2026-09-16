import { useMemo } from "react";
import { AlertTriangle, Eraser, FileSignature, Loader2, Printer, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConclusionBlank } from "@/components/lab/ConclusionBlank";
import { TwinBlank } from "@/components/lab/TwinBlank";
import {
  GENERIC_TEMPLATE_KEY,
  GENERIC_TEMPLATE_TITLE,
  applyAutofill,
  isLandscape,
  printBlank,
  templateTitle,
  templatesForLab,
  useBlankManifest,
  type AutofillSource,
  type BlankValues,
} from "@/lib/blanks";

// Radix Select bo'sh qiymatni qabul qilmaydi
const GENERIC_OPTION = "__generic__";

interface Props {
  lab: { name: string; code?: string | null };
  templateKey: string;
  values: BlankValues;
  autofill: AutofillSource;
  resultText: string;
  onTemplateChange: (key: string, values: BlankValues) => void;
  onValuesChange: (values: BlankValues) => void;
}

export const LabConclusionPanel = ({ lab, templateKey, values, autofill, resultText, onTemplateChange, onValuesChange }: Props) => {
  const { manifest, error, loading } = useBlankManifest();

  const groups = useMemo(() => (manifest ? templatesForLab(manifest, lab) : null), [manifest, lab]);
  const template = useMemo(
    () => (templateKey ? manifest?.templates.find((t) => t.key === templateKey) ?? null : null),
    [manifest, templateKey],
  );

  const setValue = (name: string, value: string) => onValuesChange({ ...values, [name]: value });
  const filledCount = Object.values(values).filter((v) => v && v.trim()).length;

  const changeTemplate = (option: string) => {
    const key = option === GENERIC_OPTION ? GENERIC_TEMPLATE_KEY : option;
    if (key === templateKey) return;
    if (filledCount > 0 && !window.confirm("Boshqa blankaga o'tilsa, shu blankaga yozilgan ma'lumotlar o'chadi. Davom etasizmi?")) {
      return;
    }
    const next = key && manifest ? manifest.templates.find((t) => t.key === key) : null;
    onTemplateChange(key, next ? applyAutofill(next, {}, autofill) : {});
  };

  const clearAll = () => {
    if (!window.confirm("Blankadagi barcha yozuvlar tozalansinmi?")) return;
    onValuesChange({});
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1 space-y-1">
          <Label className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" /> Xulosa blankasi
          </Label>
          <Select value={templateKey || GENERIC_OPTION} onValueChange={changeTemplate} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Blankani tanlang">{templateTitle(manifest, templateKey)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[420px]">
              {groups && groups.recommended.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{lab.name} blankalari</SelectLabel>
                  {groups.recommended.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.form ? `${t.form} — ` : ""}
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Boshqa</SelectLabel>
                <SelectItem value={GENERIC_OPTION}>{GENERIC_TEMPLATE_TITLE}</SelectItem>
                {groups?.others.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.form ? `${t.form} — ` : ""}
                    {t.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {template && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onValuesChange(applyAutofill(template, values, autofill))}
              title="F.I.Sh, yosh, manzil kabi bo'sh maydonlarni bemor ma'lumotlaridan to'ldirish"
            >
              <Wand2 className="h-4 w-4" /> Bemor ma'lumotlari
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={clearAll} disabled={filledCount === 0}>
              <Eraser className="h-4 w-4" /> Tozalash
            </Button>
            <Button type="button" size="sm" className="gap-2" onClick={() => printBlank(template, values, `${template.title} — ${autofill.client_name}`)}>
              <Printer className="h-4 w-4" /> Chop etish
            </Button>
            {isLandscape(template) && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-2"
                title="Qog'ozdagi kabi: A4 varaqning yuqori va pastki qismida ikkita nusxa"
                onClick={() => printBlank(template, values, `${template.title} — ${autofill.client_name}`, { twoUp: true })}
              >
                <Printer className="h-4 w-4" /> A4 ga 2 nusxa
              </Button>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}
      {templateKey && manifest && !template && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> "{templateKey}" blankasi topilmadi — ro'yxatdan boshqasini tanlang.
        </p>
      )}

      {template ? (
        <>
          <p className="text-xs text-muted-foreground">
            Blanka asl hujjat ko'rinishida. Sariq joylar — to'ldiriladigan maydonlar; ustiga bosib yozing.
            {template.pages.length > 1 && " Bir nechta nusxa bo'lsa, bir joyga yozilgani hamma nusxada chiqadi."}
          </p>
          <div className="max-h-[70vh] overflow-auto rounded-lg bg-muted/40 p-3">
            <TwinBlank template={template} values={values} onChange={setValue} />
          </div>
        </>
      ) : (
        !loading &&
        !templateKey && (
          <ConclusionBlank
            labName={lab.name}
            clientName={autofill.client_name}
            birthYear={autofill.birth_year}
            address={autofill.address}
            analysisName={autofill.analysis_name}
            conclusion={resultText}
            values={values}
            onChange={setValue}
          />
        )
      )}
    </div>
  );
};

export default LabConclusionPanel;
