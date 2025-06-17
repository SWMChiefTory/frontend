import { PopularRecipe } from "@/src/features/recipe/types/PopularRecipe";
import {
  RecipeDetailApiResponse,
  PopularRecipeApiResponse,
  RecentRecipeApiResponse,
} from "@/src/features/recipe/api/recipe";

export const recipeDetailApiMock: RecipeDetailApiResponse = {
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
      endTime: 5,
    },
    {
      stepId: "step2-Id",
      index: 2,
      description: "양파와 대파를 채 썬다.",
      startTime: 5,
      endTime: 10,
    },
    {
      stepId: "step3-Id",
      index: 3,
      description: "양념장을 만들어 재료와 섞는다.",
      startTime: 10,
      endTime: 15,
    },
    {
      stepId: "step4-Id",
      index: 4,
      description: "팬에 재료를 볶아 완성한다.",
      startTime: 15,
      endTime: 25,
    },
  ],
  totalTime: 25,
  youtubeId: "j7s9VRsrm9o",
};

export const popularRecipesApiMock: Record<string, PopularRecipeApiResponse> = {
  "1": {
    recipeId: "1",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    count: 120,
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
  },
  "2": {
    recipeId: "2",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    count: 120,
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
  },
  "3": {
    recipeId: "3",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
    count: 50,
  },
};

export const recentRecipesApiMock: Record<string, RecentRecipeApiResponse> = {
  "1": {
    recipeId: "1",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
    progress: 1,
    watchedTime: "12분 30초",
  },
  "2": {
    recipeId: "2",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
    progress: 50,
    watchedTime: "18분 15초",
  },
  "3": {
    recipeId: "3",
    title: "백종원의 제육볶음",
    youtubeId: "j7s9VRsrm9o",
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://img.youtube.com/vi/j7s9VRsrm9o/hqdefault.jpg",
    progress: 50,
    watchedTime: "18분 15초",
  },
};

export const recipeSummariesMock: PopularRecipe[] = Object.values(
  popularRecipesApiMock,
).map((apiResponse) => PopularRecipe.create(apiResponse));
