// Config/vocabulary constants ported verbatim from dashboard_patrimonial_13.html.
// These are code-level configuration, not user data, so they live here rather than in Supabase.

export const ASSET_TYPES = [
  "Efectivo",
  "Renta Fija",
  "Renta Variable",
  "Fondos Mutuos",
  "Alternativos",
  "Otros",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_COLORS: Record<AssetType, string> = {
  Efectivo: "#5C7FA8",
  "Renta Fija": "#2F8F6F",
  "Renta Variable": "#8A6E3D",
  "Fondos Mutuos": "#6B5C99",
  Alternativos: "#B15A48",
  Otros: "#3E4D68",
};

export const ACCOUNT_COLORS = [
  "#28466F",
  "#2F8F6F",
  "#B15A48",
  "#6B5C99",
  "#8A6E3D",
  "#3E4D68",
] as const;

export const KNOWN_CUSTODIANS = [
  "StoneX",
  "Pershing",
  "Santander",
  "UBS",
  "ITA",
  "Utmost",
] as const;

export const PROSPECT_STAGES = [
  ["nuevo", "Nuevo"],
  ["contactado", "Contactado"],
  ["reunion", "Reunión"],
  ["propuesta", "Propuesta"],
  ["ganado", "Ganado"],
  ["perdido", "Perdido"],
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number][0];

// External AIVA links, ported as-is from dashboard_patrimonial_13.html.
export const ONBOARDING_FORM_URL = "https://proadmin.aivaproximity.com/Forms/Stonex/PB";
export const CLIENT_PROCESSES_URL = "https://forms.aiva.com/PI_STNX";

export type RiskProfileKey = "conservador" | "balanceado" | "dinamico";

export const RISK_QUESTIONS = [
  {
    id: "horizonte",
    text: "¿En cuánto tiempo estima que necesitará este dinero?",
    options: [
      ["Menos de 1 año", 1],
      ["Entre 1 y 3 años", 2],
      ["Entre 3 y 7 años", 3],
      ["Más de 7 años", 4],
    ],
  },
  {
    id: "perdida",
    text: "Si su cartera cayera un 15% en pocos meses, ¿qué haría?",
    options: [
      ["Vendería todo de inmediato", 1],
      ["Me preocuparía y vendería una parte", 2],
      ["Lo toleraría y esperaría a que se recupere", 3],
      ["Lo vería como oportunidad para invertir más", 4],
    ],
  },
  {
    id: "experiencia",
    text: "¿Cuál es su experiencia invirtiendo en mercados financieros?",
    options: [
      ["Ninguna", 1],
      ["Básica", 2],
      ["Intermedia", 3],
      ["Avanzada", 4],
    ],
  },
  {
    id: "objetivo",
    text: "¿Cuál es el objetivo principal de esta cartera?",
    options: [
      ["Preservar el capital", 1],
      ["Generar ingresos regulares", 2],
      ["Crecimiento moderado en el tiempo", 3],
      ["Maximizar el crecimiento, aceptando volatilidad", 4],
    ],
  },
  {
    id: "liquidez",
    text: "¿Qué probabilidad hay de que necesite retirar una parte importante en el corto plazo?",
    options: [
      ["Muy probable", 1],
      ["Podría pasar", 2],
      ["Poco probable", 3],
      ["Muy poco probable, tengo otros activos líquidos", 4],
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  text: string;
  options: ReadonlyArray<readonly [string, number]>;
}>;
