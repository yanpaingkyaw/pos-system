FROM php:8.2-cli

RUN apt-get update && apt-get install -y git unzip libzip-dev && docker-php-ext-install pdo pdo_sqlite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader
RUN php artisan key:generate --force
RUN mkdir -p database && touch database/database.sqlite
RUN php artisan migrate --force
RUN php artisan db:seed --force

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
