import {CookStepApiResponse} from "@/src/features/recipe/api/recipe";
import {CookStep} from "@/src/features/recipe/cook/types/CookStep";

describe('CookStep 클래스는', () => {
    describe('of 메소드는', () => {
        it('주어진 API 응답을 기반으로 CookStep 인스턴스를 생성해야 한다', () => {
            const apiResponse: CookStepApiResponse = {
                stepId: 'step1',
                index: 1,
                description: '재료 준비하기',
                startTime: 0,
                endTime: 30,
            };

            const step = CookStep.of(apiResponse);

            expect(step.stepId).toBe(apiResponse.stepId);
            expect(step.index).toBe(apiResponse.index);
            expect(step.description).toBe(apiResponse.description);
            expect(step.startTime).toBe(apiResponse.startTime);
            expect(step.endTime).toBe(apiResponse.endTime);
        });
    })
})