/**
 * useMediaQuery — CSS 미디어 쿼리가 맞는지 따라가는 훅
 *
 * 화면 크기에 따라 같은 컴포넌트를 두 군데 중 한 곳에만 그릴 때 쓴다.
 * (CSS hidden으로 숨기면 두 벌이 모두 마운트돼 DOM·이미지가 중복된다)
 */
import {useCallback, useSyncExternalStore} from 'react'

export default function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
