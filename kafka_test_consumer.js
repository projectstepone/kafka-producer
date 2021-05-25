
const kafka = require('kafka-node');

// Kafka Consumer Configuration
const Consumer = kafka.Consumer;
const client = new kafka.KafkaClient();
const consumer = new Consumer(client, [{
    topic: 'freshdesk_wfcreate_handler',
    partition: 0
},{
    topic: 'freshdesk_wfcreate_handler',
    partition: 1
},{
    topic: 'freshdesk_wfcreate_handler',
    partition: 2
},{
    topic: 'freshdesk_wfcreate_handler',
    partition: 3
}]);

// On Receving Message from Topic
consumer.on('message', (message) => {
    console.log(message);
});