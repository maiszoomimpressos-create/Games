/** País + indicativo telefónico (E.164, sem +). Ordenado por nome em português. */
export type PhoneCountryOption = {
  iso: string;
  label: string;
  dialDigits: string;
};

const raw: PhoneCountryOption[] = [
  { iso: "DE", label: "Alemanha (+49)", dialDigits: "49" },
  { iso: "AO", label: "Angola (+244)", dialDigits: "244" },
  { iso: "AR", label: "Argentina (+54)", dialDigits: "54" },
  { iso: "AU", label: "Austrália (+61)", dialDigits: "61" },
  { iso: "AT", label: "Áustria (+43)", dialDigits: "43" },
  { iso: "BE", label: "Bélgica (+32)", dialDigits: "32" },
  { iso: "BR", label: "Brasil (+55)", dialDigits: "55" },
  { iso: "CA", label: "Canadá (+1)", dialDigits: "1" },
  { iso: "CL", label: "Chile (+56)", dialDigits: "56" },
  { iso: "CN", label: "China (+86)", dialDigits: "86" },
  { iso: "CO", label: "Colômbia (+57)", dialDigits: "57" },
  { iso: "KR", label: "Coreia do Sul (+82)", dialDigits: "82" },
  { iso: "CV", label: "Cabo Verde (+238)", dialDigits: "238" },
  { iso: "CZ", label: "Chéquia (+420)", dialDigits: "420" },
  { iso: "DK", label: "Dinamarca (+45)", dialDigits: "45" },
  { iso: "AE", label: "Emirados Árabes Unidos (+971)", dialDigits: "971" },
  { iso: "ES", label: "Espanha (+34)", dialDigits: "34" },
  { iso: "US", label: "Estados Unidos (+1)", dialDigits: "1" },
  { iso: "FR", label: "França (+33)", dialDigits: "33" },
  { iso: "GR", label: "Grécia (+30)", dialDigits: "30" },
  { iso: "GW", label: "Guiné-Bissau (+245)", dialDigits: "245" },
  { iso: "NL", label: "Países Baixos (+31)", dialDigits: "31" },
  { iso: "HU", label: "Hungria (+36)", dialDigits: "36" },
  { iso: "IN", label: "Índia (+91)", dialDigits: "91" },
  { iso: "IE", label: "Irlanda (+353)", dialDigits: "353" },
  { iso: "IL", label: "Israel (+972)", dialDigits: "972" },
  { iso: "IT", label: "Itália (+39)", dialDigits: "39" },
  { iso: "JP", label: "Japão (+81)", dialDigits: "81" },
  { iso: "LU", label: "Luxemburgo (+352)", dialDigits: "352" },
  { iso: "MO", label: "Macau (+853)", dialDigits: "853" },
  { iso: "MZ", label: "Moçambique (+258)", dialDigits: "258" },
  { iso: "MX", label: "México (+52)", dialDigits: "52" },
  { iso: "NO", label: "Noruega (+47)", dialDigits: "47" },
  { iso: "NZ", label: "Nova Zelândia (+64)", dialDigits: "64" },
  { iso: "PY", label: "Paraguai (+595)", dialDigits: "595" },
  { iso: "PE", label: "Peru (+51)", dialDigits: "51" },
  { iso: "PL", label: "Polónia (+48)", dialDigits: "48" },
  { iso: "PT", label: "Portugal (+351)", dialDigits: "351" },
  { iso: "GB", label: "Reino Unido (+44)", dialDigits: "44" },
  { iso: "RO", label: "Roménia (+40)", dialDigits: "40" },
  { iso: "SE", label: "Suécia (+46)", dialDigits: "46" },
  { iso: "CH", label: "Suíça (+41)", dialDigits: "41" },
  { iso: "ST", label: "São Tomé e Príncipe (+239)", dialDigits: "239" },
  { iso: "SN", label: "Senegal (+221)", dialDigits: "221" },
  { iso: "ZA", label: "África do Sul (+27)", dialDigits: "27" },
  { iso: "TL", label: "Timor-Leste (+670)", dialDigits: "670" },
  { iso: "UY", label: "Uruguai (+598)", dialDigits: "598" },
  { iso: "VE", label: "Venezuela (+58)", dialDigits: "58" },
];

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [...raw].sort((a, b) =>
  a.label.localeCompare(b.label, "pt"),
);

export function defaultPhoneCountryIso(): string {
  const pt = PHONE_COUNTRY_OPTIONS.find((c) => c.iso === "PT");
  return pt?.iso ?? PHONE_COUNTRY_OPTIONS[0]?.iso ?? "PT";
}

export function phoneCountryByIso(iso: string): PhoneCountryOption | undefined {
  return PHONE_COUNTRY_OPTIONS.find((c) => c.iso === iso);
}
