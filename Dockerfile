# syntax=docker/dockerfile:1
   
FROM php:7.4-apache
COPY src/ /var/www/html/
EXPOSE 80
