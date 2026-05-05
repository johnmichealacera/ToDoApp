# syntax=docker/dockerfile:1

FROM php:8.3-cli-alpine

COPY src/ /var/www/html/

WORKDIR /var/www/html

EXPOSE 80

# Built-in server — sufficient for a static front-end + PHP shim in container demos.
CMD ["php", "-S", "0.0.0.0:80", "-t", "/var/www/html/"]
