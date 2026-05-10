export type ImageQuality = "medium" | "high";
export type GenerationFlowType = "trial" | "single" | "credit";

const FLOW_QUALITIES: Record<GenerationFlowType, ImageQuality[]> = {
  trial:  ["medium"], // 1 imagem grátis — qualidade média
  single: ["high"],   // 1 imagem paga — qualidade alta
  credit: ["high"],   // 1 imagem paga — qualidade alta
};

export function getGenerationQualities(flowType: GenerationFlowType): ImageQuality[] {
  return FLOW_QUALITIES[flowType];
}
