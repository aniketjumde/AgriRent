# Stage 1: Build the React application
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy default nginx configuration if custom routing is needed, or let default handle it
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
