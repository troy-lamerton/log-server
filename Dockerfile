FROM mhart/alpine-node:10.15.3

EXPOSE 8090

COPY . /project

WORKDIR /project
RUN [ "yarn" ]
RUN [ "yarn", "build" ]

WORKDIR /project/build
ENTRYPOINT [ "node", "index.js" ]