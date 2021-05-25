FROM node:14.16.1

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential

RUN mkdir -p  /home/producer-kafka/node_modules
WORKDIR /home/producer-kafka
RUN chown -R node:node /home/producer-kafka
ADD package.json /home/producer-kafka/package.json
USER node
RUN npm install;exit 0
ADD . /home/producer-kafka
RUN npm rebuild;exit 0
EXPOSE 5001
CMD ["node","kafka_producer.js"]
