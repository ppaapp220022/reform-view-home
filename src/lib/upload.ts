/**
 * 이미지 업로드 용량 한도와 안내 문구 (판매글 사진·프로필 사진 공용)
 *
 * 백엔드 spring.servlet.multipart 한도(파일 1개 10MB, 요청 전체 30MB)를 넘으면 413을 돌려준다.
 * 앞단 nginx(프론트 컨테이너·NPM)도 client_max_body_size 30m으로 이 한도보다 작지 않게 맞춘다.
 * 다시 시도해도 같은 결과이므로 "잠시 후 다시 시도" 대신 사진 크기를 줄이도록 안내한다.
 */
import axios from 'axios'

/** 사진 1장 한도 - 백엔드 max-file-size(10MB)와 같다 */
export const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024

/** 판매글처럼 여러 장을 한 번에 올릴 때의 안내 */
export const UPLOAD_TOO_LARGE_NOTICE = '사진 용량이 너무 커요. 사진 1장은 10MB, 한 번에 올리는 사진은 합쳐서 30MB 이하로 올려주세요.'

/** 프로필처럼 한 장만 올릴 때의 안내 */
export const SINGLE_UPLOAD_TOO_LARGE_NOTICE = '사진 용량이 너무 커요. 10MB 이하 사진으로 올려주세요.'

/** 이미지 업로드가 용량 한도 때문에 거절됐는지 */
export function isUploadTooLarge(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 413
}
