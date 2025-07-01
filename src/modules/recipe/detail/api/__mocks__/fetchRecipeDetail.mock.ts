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
      stepId: "step1",
      index: 1,
      description:
        "대파를 반 갈라 5cm 길이로 썰고, 청양고추는 두껍게 어슷하게 썰어줍니다. 마늘은 두껍게 편 썰고, 삼겹살은 한입 크기로 잘라줍니다",
      startTime: 0,
      endTime: 13.09,
    },
    {
      stepId: "step2",
      index: 2,
      description:
        "팬에 삼겹살을 올리고 맛소금과 후춧가루를 뿌려 중약 불로 구워줍니다. 삼겹살이 노릇하게 익으면 마늘을 넣고 구워줍니다",
      startTime: 201.82,
      endTime: 220.39,
    },
    {
      stepId: "step3",
      index: 3,
      description: "팬에 삼겹살을 올리고 맛소금과 후춧가루를 뿌려 구워주기",
      startTime: 206.86,
      endTime: 217.24,
    },
    {
      stepId: "step4",
      index: 4,
      description:
        "구운 마늘에 설탕을 넣어 볶고, 간장을 팬 주위에 뿌려 불향을 내줍니다. 손질한 대파와 고춧가루를 넣고 볶은 후, 물을 넣어 양념이 겉돌지 않게 합니다.",
      startTime: 220.39,
      endTime: 427.5,
    },
    {
      stepId: "step5",
      index: 5,
      description:
        "파의 숨이 죽기 전에 후춧가루와 참기름을 넣고 섞은 후, 접시에 담아 깨소금을 뿌려 완성합니다",
      startTime: 427.5,
      endTime: 604,
    },
  ],
  totalTime: 25,
  youtubeId: "j7s9VRsrm9o",
};
