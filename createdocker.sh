
## 删除容器
docker rm hu60node

##第一次安装
docker run --workdir /app --name hu60node -it -v $PWD:/app -p80:80 node:latest  sh

npm config set registry https://registry.npmmirror.com && npm install


##启动
docker exec -it  hu60node  -workdir /app  npm run dev

