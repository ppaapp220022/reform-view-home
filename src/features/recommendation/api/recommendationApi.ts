/**
 * recommendationApi.ts — AI 개인화 추천 API
 *
 * GET /api/listings/recommendations?size={n}
 *   - 로그인 회원 대상 추천 (현재 백엔드는 인기 게시글 기반)
 *   - 비로그인 시 빈 배열 반환
 */
import apiClient from '../../../lib/axios'
import type { DeliveryType, Grade, PostStatus, Sport } from '../../../types/listing'

/** 백엔드 RecommendPostCardDTO */
export interface RecommendPostCard {
  postId: number
  title: string
  team: string
  sport: Sport
  price: number
  grade: Grade
  size: string | null
  deliveryType: DeliveryType
  status: PostStatus
  viewCount: number
  wishCount: number
  thumbnailUrl: string | null
  createdAt: string
  /** 추천 사유 (현재 백엔드는 "인기 게시글 기반 추천" 고정) */
  recommendReason: string
}

/**
 * AI 개인화 추천 목록 조회
 * @param size 반환할 게시글 수 (기본 20, 최대 50)
 */
export async function getRecommendations(size = 20): Promise<RecommendPostCard[]> {
  const res = await apiClient.get<RecommendPostCard[]>('/listings/recommendations', {
    params: { size },
  })
  // axios 인터셉터가 ApiResponse<T>를 언래핑해 data를 반환
  return res.data
}
