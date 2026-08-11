import { z } from "zod";

// Service categories with prices
export const SERVICE_CATEGORIES = {
  "Bak labaratoriyasi": [
    { name: "Brusiliozga seralogik tekshiriv", price: 55000 },
    { name: "Yiringli namunalar gemo.Urina kaprakulturalarni patogen floraga tekshirish va Antibiotiklar sezuvchanligini aniqlash", price: 72000 },
    { name: "Dekretiv kontinentlarni ichak infeksiyasiga tekshirish (oziq-ovqat hodimlarini)", price: 72000 },
    { name: "Amblator bemorlarni ichak infeksiyasiga tekshirish", price: 72000 },
    { name: "Burundan surtma stafilokokkga tekshirish", price: 72000 },
  ],
  "Parazitalogiya labaratoriyasi": [
    { name: "Najas va surtmalarni ikki hil usulda parazitalogik tekshirish (ambulator)", price: 40000 },
    { name: "Najas va surtmalarni ikki hil usulda parazitalogik tekshirish dekretiv kontingentlarni (oziq ovqat hodimlari)", price: 40000 },
  ],
} as const;

// Flatten service types for validation
export const SERVICE_TYPES = [
  "Brusiliozga seralogik tekshiriv",
  "Yiringli namunalar gemo.Urina kaprakulturalarni patogen floraga tekshirish va Antibiotiklar sezuvchanligini aniqlash",
  "Dekretiv kontinentlarni ichak infeksiyasiga tekshirish (oziq-ovqat hodimlarini)",
  "Amblator bemorlarni ichak infeksiyasiga tekshirish",
  "Burundan surtma stafilokokkga tekshirish",
  "Najas va surtmalarni ikki hil usulda parazitalogik tekshirish (ambulator)",
  "Najas va surtmalarni ikki hil usulda parazitalogik tekshirish dekretiv kontingentlarni (oziq ovqat hodimlari)",
] as const;

// Get price for a service
export const getServicePrice = (serviceName: string): number => {
  for (const services of Object.values(SERVICE_CATEGORIES)) {
    const service = services.find(s => s.name === serviceName);
    if (service) return service.price;
  }
  return 0;
};

// Client form validation schema
export const clientSchema = z.object({
  firstName: z
    .string()
    .min(1, "Ism kiritilishi shart")
    .max(100, "Ism 100 belgidan oshmasligi kerak")
    .regex(/^[\p{L}\s'-]+$/u, "Ism faqat harflar va bo'shliqlardan iborat bo'lishi kerak"),
  lastName: z
    .string()
    .min(1, "Familiya kiritilishi shart")
    .max(100, "Familiya 100 belgidan oshmasligi kerak")
    .regex(/^[\p{L}\s'-]+$/u, "Familiya faqat harflar va bo'shliqlardan iborat bo'lishi kerak"),
  birthYear: z
    .string()
    .regex(/^\d{4}$/, "Tug'ilgan yil 4 ta raqamdan iborat bo'lishi kerak")
    .refine((year) => {
      const y = parseInt(year);
      const currentYear = new Date().getFullYear();
      return y >= 1900 && y <= currentYear;
    }, "Tug'ilgan yil 1900 va hozirgi yil orasida bo'lishi kerak"),
  address: z
    .string()
    .min(1, "Manzil kiritilishi shart")
    .max(500, "Manzil 500 belgidan oshmasligi kerak"),
  workplace: z
    .string()
    .min(1, "Ish joyi kiritilishi shart")
    .max(200, "Ish joyi 200 belgidan oshmasligi kerak"),
  serviceType: z.enum(SERVICE_TYPES, {
    errorMap: () => ({ message: "Xizmat turi tanlanishi shart" }),
  }),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Elektron pochta kiritilishi shart")
    .email("Noto'g'ri elektron pochta formati")
    .max(255, "Elektron pochta 255 belgidan oshmasligi kerak"),
  password: z
    .string()
    .min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
    .max(128, "Parol 128 belgidan oshmasligi kerak"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Payment amount validation
export const paymentAmountSchema = z
  .number()
  .positive("To'lov miqdori musbat bo'lishi kerak")
  .max(100000000, "To'lov miqdori juda katta");
