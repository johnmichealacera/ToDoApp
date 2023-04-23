# syntax=docker/dockerfile:1

FROM php:7.4-alpine
COPY src/ /var/www/html/
EXPOSE 80
CMD ["php", "-S", "0.0.0.0:80", "-t", "/var/www/html/"]
