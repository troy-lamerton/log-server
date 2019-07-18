FROM node:lts

EXPOSE 80
# might use port 5000 in the future
EXPOSE 5000

COPY . /log-server
WORKDIR /log-server

RUN yarn install --frozen-lockfile --non-interactive --production=false
RUN yarn build

ENV PORT 80
ENV NODE_ENV production

CMD yarn production
