// Jizzax viloyat SES markazi — qabul va to'lov, laboratoriya konstantalari

export const PAYMENT_METHODS = [
  { value: "naqd", label: "Naqd" },
  { value: "karta", label: "Karta" },
  { value: "terminal", label: "Terminal" },
  { value: "elektron", label: "Elektron to'lov" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "tolanmagan", label: "To'lanmagan" },
  { value: "qisman", label: "Qisman to'langan" },
  { value: "tolangan", label: "To'langan" },
] as const;

export const LAB_STATUSES = [
  { value: "yangi", label: "Yangi" },
  { value: "mijoz_keldi", label: "Mijoz keldi" },
  { value: "namuna_qabul", label: "Namuna qabul qilindi" },
  { value: "jarayonda", label: "Analiz jarayonida" },
  { value: "natija_tayyor", label: "Natija tayyor" },
  { value: "natija_tasdiqlandi", label: "Natija tasdiqlandi" },
  { value: "yakunlandi", label: "Yakunlandi" },
] as const;

export const VISIT_TYPES = [
  "Shaxsiy murojaat",
  "Tashkilot yo'llanmasi",
  "Dekretiv kontingent",
  "Shifokor yo'llanmasi",
  "Nazorat tekshiruvi",
] as const;

export const GENDERS = [
  { value: "erkak", label: "Erkak" },
  { value: "ayol", label: "Ayol" },
] as const;

export const labStatusLabel = (v: string) =>
  LAB_STATUSES.find((s) => s.value === v)?.label ?? v;

export const paymentStatusLabel = (v: string) =>
  PAYMENT_STATUSES.find((s) => s.value === v)?.label ??
  (v === "kutilmoqda" ? "To'lanmagan" : v);

export const paymentMethodLabel = (v: string) =>
  PAYMENT_METHODS.find((s) => s.value === v)?.label ?? v;

export const formatSum = (n: number | null | undefined) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n ?? 0)))} so'm`;

// Qabul jarayoni holati (laboratoriya buyurtmalaridan hisoblanadi)
export const PROCESS_STATUSES = [
  { value: "qabul_qilindi", label: "Qabul qilindi" },
  { value: "yollandi", label: "Laboratoriyaga yo'naltirildi" },
  { value: "jarayonda", label: "Analiz jarayonida" },
  { value: "natija_tayyor", label: "Natija tayyor" },
  { value: "yakunlandi", label: "Yakunlandi" },
] as const;

export const processStatusLabel = (v: string) =>
  PROCESS_STATUSES.find((s) => s.value === v)?.label ?? v;

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
}

export interface ServiceRow {
  id: string;
  name: string;
  service_type: string;
  sample_type: string;
  price: number;
  conclusion_template: string;
  laboratory_id: string | null;
  district_id: string | null;
  district_name?: string | null;
  is_active: boolean;
}

export const CONCLUSION_TEMPLATES = [
  { value: "", label: "Umumiy (standart) xulosa blankasi" },
  { value: "brutselloz_ifa", label: "Bruselloz IFA (IgM/IgG)" },
  { value: "trichomonas_candida_ifa", label: "Trichomonas/Candida IFA (IgM/IgG)" },
  { value: "echinokokk_ifa", label: "Exinokokk IFA (IgM/IgG)" },
  { value: "brutselloz_serological", label: "Bruselloz seroligik xulosasi (Heddelson/Rayt)" },
] as const;

export const ROLE_OPTIONS = [
  { value: "main", label: "Bosh admin" },
  { value: "qabul", label: "Qabul" },
  { value: "payment", label: "To'lov" },
  { value: "registrants", label: "Ro'yxatdan o'tganlar" },
  { value: "viloyat", label: "Viloyat nazoratchisi" },
  { value: "laborant", label: "Laborant" },
] as const;

export const roleLabel = (v: string | null) =>
  ROLE_OPTIONS.find((r) => r.value === v)?.label ?? (v ?? "Rol yo'q");