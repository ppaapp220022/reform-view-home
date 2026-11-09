/**
 * SearchEmbeddingPanel — 의미 검색 재임베딩 (관리자 게시글 관리 화면 상단)
 *
 * 기능:
 *   - 전체 판매글 재임베딩 시작 (POST /api/admin/embed/posts)
 *   - 진행 상황 표시 - 실행 중이면 2초마다 다시 조회
 *   - 끝나면 결과(실패 수·이전 모델 벡터 정리·검색 확인) 표시
 *
 * 재임베딩은 임베딩 모델을 바꿨거나 벡터가 판매글과 어긋났을 때만 필요하다.
 * OpenAI 비용이 들고 판매글 수천 건이면 1분 안팎 걸린다.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {AlertCircle, Loader2, RefreshCw, Sparkles} from 'lucide-react'
import type {EmbedJobState, EmbedJobStatus} from '../api/adminApi'
import {getEmbedJobStatus, isEmbedUnavailableError, startEmbedJob} from '../api/adminApi'
import {formatNumber} from '../../../utils/format'

const STATUS_QUERY_KEY = ['admin-embed-status']
const POLL_INTERVAL_MS = 2_000

const STATE_LABELS: Record<EmbedJobState, { label: string; color: string; bg: string }> = {
  IDLE: {label: '대기', color: 'var(--color-text-hint)', bg: 'var(--color-surface-overlay)'},
  RUNNING: {label: '진행 중', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'},
  DONE: {label: '완료', color: 'var(--color-success)', bg: 'var(--color-success-bg)'},
  FAILED: {label: '실패', color: 'var(--color-error)', bg: 'var(--color-error-bg)'},
}

/** 서버 LocalDateTime("2026-11-09T20:41:05.123") → "2026-11-09 20:41:05" */
function formatTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function startErrorMessage(error: unknown): string {
  return isEmbedUnavailableError(error)
    ? '벡터 저장소가 꺼져 있어 재임베딩할 수 없습니다.'
    : '재임베딩을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export default function SearchEmbeddingPanel() {
  const queryClient = useQueryClient()

  const {data: status, isLoading, isError} = useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: getEmbedJobStatus,
    // 실행 중일 때만 진행 상황을 따라간다
    refetchInterval: query => (query.state.data?.state === 'RUNNING' ? POLL_INTERVAL_MS : false),
  })

  const {mutate: start, isPending, error: startError} = useMutation({
    mutationFn: startEmbedJob,
    // 이미 나가 있던 상태 조회가 시작 뒤에 도착해 RUNNING을 덮어쓰지 않게 먼저 취소한다
    async onMutate() {
      await queryClient.cancelQueries({queryKey: STATUS_QUERY_KEY})
    },
    onSuccess(next: EmbedJobStatus) {
      queryClient.setQueryData(STATUS_QUERY_KEY, next)
    },
    // 시작 요청이 타임아웃 등으로 실패해도 서버에선 시작됐을 수 있으니 실제 상태를 다시 읽는다
    onError() {
      void queryClient.invalidateQueries({queryKey: STATUS_QUERY_KEY})
    },
  })

  const running = status?.state === 'RUNNING'
  const state = STATE_LABELS[status?.state ?? 'IDLE']
  const percent = status && status.total > 0 ? Math.min(100, Math.round((status.processed / status.total) * 100)) : 0

  function handleStart() {
    if (confirm('전체 판매글을 다시 임베딩합니다.\nOpenAI 비용이 들고 1분 안팎 걸립니다. 진행할까요?')) {
      start()
    }
  }

  return (
    <section className="mb-6 rounded-2xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-info)]"/>
          <h2 className="text-sm font-bold text-text-main">의미 검색 재임베딩</h2>
          {status && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{color: state.color, background: state.bg}}
            >
              {state.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={running || isPending || isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-primary disabled:opacity-50"
        >
          {running || isPending
            ? <><Loader2 size={14} className="animate-spin"/>진행 중...</>
            : <><RefreshCw size={14}/>재임베딩 시작</>}
        </button>
      </div>

      <p className="text-xs mt-1.5 text-[var(--color-text-hint)]">
        임베딩 모델을 바꿨거나 검색 결과가 판매글과 어긋날 때만 실행하세요. 판매 상태 변경은 자동으로 반영됩니다.
      </p>

      {isError && (
        <p className="flex items-center gap-1.5 text-xs mt-3 text-[var(--color-error)]">
          <AlertCircle size={13}/>진행 상황을 불러오지 못했습니다.
        </p>
      )}

      {startError && (
        <p className="flex items-center gap-1.5 text-xs mt-3 text-[var(--color-error)]">
          <AlertCircle size={13}/>{startErrorMessage(startError)}
        </p>
      )}

      {status && status.state !== 'IDLE' && (
        <div className="mt-4 flex flex-col gap-2 text-xs text-[var(--color-text-sub)]">
          <div
            className="h-2 rounded-full overflow-hidden bg-[var(--color-surface-sunken)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{width: `${percent}%`, background: state.color}}
            />
          </div>
          <p>
            {formatNumber(status.processed)} / {formatNumber(status.total)}건 처리 ({percent}%)
            · 저장 {formatNumber(status.embedded)}건
            · 실패 <span className={status.failed > 0 ? 'text-[var(--color-error)]' : undefined}>{formatNumber(status.failed)}건</span>
          </p>
          <p>시작 {formatTime(status.startedAt)} · 종료 {formatTime(status.finishedAt)}</p>
          {status.cleanup && <p>정리: {status.cleanup}</p>}
          {status.searchCheck && <p>검색 확인: {status.searchCheck}</p>}
          {status.lastError && (
            <p className="text-[var(--color-error)]">마지막 오류: {status.lastError}</p>
          )}
        </div>
      )}

      {status?.note && (
        <p className="text-xs mt-3 text-[var(--color-text-hint)]">{status.note}</p>
      )}
    </section>
  )
}
