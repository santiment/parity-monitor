 #! /bin/sh

docker-compose -f ./docker/docker-compose.yml --env-file .env up --build monitor
