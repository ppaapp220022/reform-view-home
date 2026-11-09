FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
# lock 파일 그대로 설치 (npm install은 다른 버전을 받을 수 있다)
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_WS_BASE_URL=
ARG VITE_TOSS_CLIENT_KEY=
ARG VITE_TOSS_MOCK=false
# ARG는 아래 RUN에서 환경변수로 보이므로 Vite 빌드에 그대로 쓰인다 (ENV로 이미지에 남길 필요 없음)

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80