FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json, package-lock.json и файл users.json для установки зависимостей и данных
COPY package*.json ./
COPY users.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальной исходный код приложения
COPY . .

# Указываем порт, на котором работает приложение
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "index.js"]
