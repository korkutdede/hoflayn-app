import type { MessageKey } from "@hoflayn/i18n";
import { CalcError } from "./error";
import type { CalcMessage } from "./messages";

export type CarrierProfileId = "yurtici" | "aras" | "mng" | "custom";

export type CarrierProfile = {
  id: CarrierProfileId;
  divisor: number;
};

export const CARRIER_PROFILES: CarrierProfile[] = [
  { id: "yurtici", divisor: 3000 },
  { id: "aras", divisor: 3000 },
  { id: "mng", divisor: 3000 },
  { id: "custom", divisor: 3000 },
];

export function carrierLabelKey(id: CarrierProfileId): MessageKey {
  return `calc.carrier.${id}.label`;
}

export function carrierNotesKey(id: CarrierProfileId): MessageKey {
  return `calc.carrier.${id}.notes`;
}

export type DesiInput = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg?: number | null;
  carrierId?: CarrierProfileId;
  divisor?: number | null;
};

export type DesiResult = {
  volumeCm3: number;
  divisor: number;
  carrierId: CarrierProfileId;
  desi: number;
  actualWeightKg: number | null;
  billableWeightKg: number;
  assumptions: CalcMessage[];
};

function resolveDivisor(input: DesiInput): {
  divisor: number;
  carrierId: CarrierProfileId;
  assumptions: CalcMessage[];
} {
  const assumptions: CalcMessage[] = [];
  const carrierId = input.carrierId ?? "yurtici";
  const profile = CARRIER_PROFILES.find((item) => item.id === carrierId);
  if (!profile) throw new CalcError("calc.desi.invalidCarrier");

  if (carrierId === "custom") {
    const divisor = input.divisor ?? profile.divisor;
    if (!Number.isFinite(divisor) || divisor <= 0) {
      throw new CalcError("calc.desi.divisorPositive");
    }
    if (input.divisor == null) {
      assumptions.push({ messageKey: "calc.desi.customDivisorDefault" });
    }
    return { divisor, carrierId, assumptions };
  }

  if (input.divisor != null && input.divisor !== profile.divisor) {
    assumptions.push({
      messageKey: "calc.desi.divisorOverride",
      vars: { profile: profile.divisor, custom: input.divisor },
    });
    return { divisor: input.divisor, carrierId, assumptions };
  }

  return { divisor: profile.divisor, carrierId, assumptions };
}

const DIM_ERROR_KEYS = {
  length: "calc.desi.lengthPositive",
  width: "calc.desi.widthPositive",
  height: "calc.desi.heightPositive",
} as const satisfies Record<string, MessageKey>;

export function calculateDesi(input: DesiInput): DesiResult {
  for (const [name, value] of [
    ["length", input.lengthCm],
    ["width", input.widthCm],
    ["height", input.heightCm],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new CalcError(DIM_ERROR_KEYS[name]);
    }
  }

  const { divisor, carrierId, assumptions } = resolveDivisor(input);
  const volumeCm3 = input.lengthCm * input.widthCm * input.heightCm;
  const desi = Math.ceil((volumeCm3 / divisor) * 1000) / 1000;
  const actualWeightKg =
    input.weightKg == null || input.weightKg === undefined
      ? null
      : input.weightKg;
  if (
    actualWeightKg != null &&
    (!Number.isFinite(actualWeightKg) || actualWeightKg < 0)
  ) {
    throw new CalcError("calc.desi.weightPositive");
  }
  if (actualWeightKg == null) {
    assumptions.push({ messageKey: "calc.desi.weightMissing" });
  }

  const billableWeightKg =
    actualWeightKg == null ? desi : Math.max(actualWeightKg, desi);

  return {
    volumeCm3,
    divisor,
    carrierId,
    desi,
    actualWeightKg,
    billableWeightKg,
    assumptions,
  };
}
