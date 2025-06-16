import { RecipeSummary } from '@/src/features/recipe/types/RecipeSummary';
import { RecipeSummaryApiResponse } from '@/src/features/recipe/api/recipe';

describe('RecipeSummary 클래스', () => {
    describe('create 메서드는', () => {
        const apiResponse: RecipeSummaryApiResponse = {
            recipeId: 'r123',
            title: '계란말이',
            youtubeId: 'yt12345',
            count: 42,
            createdAt: '2024-05-01T12:00:00Z',
        };

        it('API 응답을 기반으로 RecipeSummary 인스턴스를 생성해야 한다', () => {
            const summary = RecipeSummary.create(apiResponse);

            expect(summary.recipeId).toBe(apiResponse.recipeId);
            expect(summary.title).toBe(apiResponse.title);
            expect(summary.youtubeId).toBe(apiResponse.youtubeId);
            expect(summary.count).toBe(apiResponse.count);
            expect(summary.createdAt.getTime()).toBe(new Date(apiResponse.createdAt).getTime());
        });

        it('createdAt이 잘못된 날짜일 경우 Invalid Date가 되어야 한다', () => {
            const invalidApiResponse = {
                ...apiResponse,
                createdAt: 'invalid-date',
            };

            const summary = RecipeSummary.create(invalidApiResponse);

            expect(isNaN(summary.createdAt.getTime())).toBe(true);
        });
    });
});
