/**
 * useMediaQuery — CSS 미디어 쿼리가 맞는지 따라가는 훅
 *
 * 화면 크기에 따라 같은 컴포넌트를 두 군데 중 한 곳에만 그릴 때 쓴다.
 * (CSS hidden으로 숨기면 두 벌이 모두 마운트돼 DOM·이미지가 중복된다)
 */
import {useCallback, useMemo, useSyncExternalStore} from 'react'

export default function useMediaQuery(query: string): boolean {
  // 렌더마다 새로 만들지 않고 query별로 한 번만 만든다 (등록 화면은 입력할 때마다 다시 그려진다)
  const mediaQuery = useMemo(() => window.matchMedia(query), [query])

  const subscribe = useCallback((onChange: () => void) => {
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [mediaQuery])

  return useSyncExternalStore(subscribe, () => mediaQuery.matches)
}
