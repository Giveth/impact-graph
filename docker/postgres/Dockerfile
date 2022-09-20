# Dockerfile relative to docker-compose.yml

FROM postgres:13.8

RUN apt-get update
RUN apt-get -y install postgresql-13-cron
COPY init-db /docker-entrypoint-initdb.d
RUN chmod +x /docker-entrypoint-initdb.d/*
