# Telemedicine Producer

## How to run in local

1. Setup VS Code or any IDE with the root directory of the project having package.json file
2. Run `npm install` from root directory
3. Run `node kafka_producer.js` to start the server
4. Now server is up and running

## How to test Kafka Producer in local

1. Run `docker-compose -f docker-compose-kafka.yml up -d` from root directory of the project
2. Login to kafka docker container from Docker Desktop or using `docker exec -it <container> /bin/sh` command
3. Run `cd /opt/bitnami/kafka/bin`
4. Create a topic via command: `kafka-topics.sh --create --zookeeper zookeeper:2181 --replication-factor <replication factor> --partitions <partition count> --topic <topic name>`
5. Validate topic creation via command `kafka-topics.sh --list --zookeeper zookeeper:2181`
6. Kafka setup has completed successfully
7. Update `$.kafka.host = localhost:9092` in config/default.json file
8. Run `node kafka_producer.js` to start the server
9. Now invoke relevant APIs using Chrome or PostMan to test the message publishing to Kafka
10. To consume messages published to Kafka, modify kafka_test_consumer.js with relevant topic name and partition details
11. Run `node kafka_test_consumer.js`

Make sure that port 2181, 9092 is available on your machine as they are being used by Zookeeper and Kafka.