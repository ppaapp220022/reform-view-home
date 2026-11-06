/**
 * useAiSuggest.ts — 판매글 AI 제목/설명 추천 상태
 *
 * 판매글 작성 화면은 모바일·데스크탑용 AI 패널을 따로 렌더하므로,
 * 상태를 페이지에서 한 번만 만들고 두 패널이 함께 쓰게 한다 (화면 폭이 바뀌어도 결과가 유지된다).
 */
import axios from 'axios'
import {useEffect, useRef, useState} from 'react'
import {suggestListingFromImage} from '../api/listingApi'

/** AI 추천 실패 안내 문구 */
const AI_FAILED_NOTICE = 'AI 추천을 만들지 못했어요. 잠시 후 다시 시도해주세요.'
const AI_NO_PRODUCT_NOTICE = '사진에서 판매할 상품을 찾지 못했어요. 상품이 잘 보이는 사진을 첫 번째로 올려주세요.'

/** 백엔드 RestAuthenticationEntryPoint가 인증 정보가 없을 때 403과 함께 내려주는 코드 */
const AUTH_MISSING_CODE = '40300'

export interface AiSuggestion {
  title: string
  description: string
}

/** 요청 오류를 다시 시도로 해결되는지에 따라 구분해 안내한다 */
function aiErrorNotice(err: unknown): string {
  if (!axios.isAxiosError(err)) return AI_FAILED_NOTICE
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return 'AI 분석이 너무 오래 걸려 중단됐어요. 잠시 후 다시 시도해주세요.'
  }
  if (!err.response) return '서버에 연결하지 못했어요. 네트워크 상태를 확인해주세요.'
  const {status, data} = err.response
  const authMissing = status === 403 && (data as { code?: string } | undefined)?.code === AUTH_MISSING_CODE
  if (status === 401 || authMissing) return '로그인이 만료됐어요. 다시 로그인한 뒤 시도해주세요.'
  if (status === 403) return 'AI 추천을 사용할 권한이 없어요.'
  return AI_FAILED_NOTICE
}

/**
 * @param image 분석할 사진 (이번 세션에 올린 첫 번째 사진). 바뀌면 진행 중인 요청을 취소하고 이전 결과는 숨긴다
 */
export function useAiSuggest(image: File | null) {
  /** 분석 중인 사진 — 사진이 바뀌면 이전 요청은 취소되므로 현재 사진일 때만 로딩으로 본다 */
  const [loadingImage, setLoadingImage] = useState<File | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** 마지막 AI 요청 결과 — 어떤 사진으로 요청했는지 함께 기억한다 (추천 카드 또는 안내 문구 중 하나) */
  const [outcome, setOutcome] = useState<{
    image: File
    result?: AiSuggestion
    notice?: string
  } | null>(null)

  /* 응답이 오는 사이 사진이 바뀐 경우도 같은 기준으로 걸러진다. */
  const current = outcome?.image === image ? outcome : null

  /* 첫 번째 사진이 바뀌거나 화면을 떠나면 진행 중인 요청을 취소한다 (버튼 잠김·불필요한 AI 비용 방지) */
  useEffect(() => () => abortRef.current?.abort(), [image])

  async function request() {
    if (!image) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoadingImage(image)
    setOutcome(null)
    try {
      const result = await suggestListingFromImage(image, controller.signal)
      /* OK가 아니면 제목·설명이 빈 값이라, 적용하면 작성 중인 내용이 지워진다. 카드 대신 안내만 보여준다.
         status가 없는 이전 백엔드 응답은 빈 값 여부로 판단한다. */
      const title = result.title?.trim() ?? ''
      const description = result.description?.trim() ?? ''
      const hasContent = Boolean(title || description)
      const status = result.status ?? (hasContent ? 'OK' : 'FAILED')
      if (status === 'OK' && hasContent) {
        setOutcome({image, result: {title, description}})
      } else if (status === 'NO_PRODUCT') {
        setOutcome({image, notice: AI_NO_PRODUCT_NOTICE})
      } else {
        setOutcome({image, notice: AI_FAILED_NOTICE})
      }
    } catch (err) {
      /* 사진 교체·화면 이탈로 취소한 요청은 오류가 아니다 */
      if (controller.signal.aborted) return
      console.error('[AI 추천] 오류:', err)
      setOutcome({image, notice: aiErrorNotice(err)})
    } finally {
      setLoadingImage((loading) => (loading === image ? null : loading))
    }
  }

  return {
    result: current?.result ?? null,
    notice: current?.notice ?? null,
    loading: loadingImage !== null && loadingImage === image,
    canGenerate: image != null,
    request,
  }
}

export type AiSuggestState = ReturnType<typeof useAiSuggest>
