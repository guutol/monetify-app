export type ImageQuality = "medium" | "high";
export type GenerationFlowType = "trial" | "single" | "credit";

const FLOW_QUALITIES: Record<GenerationFlowType, ImageQuality[]> = {
  trial:  ["medium"],       // 1 imagem grátis — qualidade média
  single: ["high", "high"], // 2 prévias pagas — qualidade alta
  credit: ["high", "high"], // 2 prévias pagas — qualidade alta
};

export function getGenerationQualities(flowType: GenerationFlowType): ImageQuality[] {
  return FLOW_QUALITIES[flowType];
}
