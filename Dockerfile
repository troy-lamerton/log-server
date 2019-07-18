FROM node:lts

EXPOSE 80
EXPOSE 5000

COPY . /log-server
WORKDIR /log-server

RUN yarn install --frozen-lockfile --non-interactive --production=false
RUN yarn build

ENV PORT 80
ENV NODE_ENV production

CMD yarn production-docker