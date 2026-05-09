export type ImageQuality = "medium" | "high";
export type GenerationFlowType = "trial" | "single" | "credit";

const FLOW_QUALITIES: Record<GenerationFlowType, [ImageQuality, ImageQuality]> = {
  trial:  ["medium", "medium"],
  single: ["medium", "medium"],
  credit: ["medium", "high"],
};

export function getGenerationQualities(flowType: GenerationFlowType): [ImageQuality, ImageQuality] {
  return FLOW_QUALITIES[flowType];
}
