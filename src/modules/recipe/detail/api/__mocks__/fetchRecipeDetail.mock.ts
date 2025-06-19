import { RecipeFlowApiResponse } from "@/src/modules/recipeFlow/api/RecipeFlowApi";

export const recipeDetailApiMock: RecipeFlowApiResponse = {
  title: "백종원의 제육볶음",
  summary: "매콤달콤한 양념으로 밥도둑 제육볶음을 완성해보세요.",
  ingredients: [
    "돼지고기 앞다리살",
    "양파",
    "대파",
    "고추장",
    "고춧가루",
    "간장",
    "설탕",
    "다진 마늘",
    "참기름",
    "후추",
  ],
  steps: [
    {
      stepId: "step1-Id",
      index: 1,
      description: "돼지고기를 먹기 좋은 크기로 썬다.",
      startTime: 0,
      endTime: 25,
    },
    {
      stepId: "step2-Id",
      index: 2,
      description: "양파와 대파를 채 썬다.",
      startTime: 25,
      endTime: 50,
    },
    {
      stepId: "step3-Id",
      index: 3,
      description: "양념장을 만들어 재료와 섞는다.",
      startTime: 50,
      endTime: 75,
    },
    {
      stepId: "step4-Id",
      index: 4,
      description: "팬에 재료를 볶아 완성한다.",
      startTime: 75,
      endTime: 100,
    },
  ],
  totalTime: 25,
  youtubeId: "j7s9VRsrm9o",
};
