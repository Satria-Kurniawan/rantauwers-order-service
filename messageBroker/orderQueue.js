const amqp = require("amqplib/callback_api");
const Order = require("../models/orderModel");

const uri = process.env.MESSAGE_BROKER;
const port = process.env.MESSAGE_BROKER_PORT;

// Memproduksi detail order
const orderQueue = () => {
  amqp.connect(`${uri}:${port}`, (err, conn) => {
    if (err) throw err;

    conn.createChannel((err, channel) => {
      if (err) throw err;

      const queueName = "order_queue";

      channel.assertQueue(queueName, {
        durable: false,
      });

      console.log(`Waiting for requests from ${queueName}`);

      channel.consume(
        queueName,
        async (msg) => {
          const orderId = msg.content.toString();
          console.log(`Received request for order with id: ${orderId}`);

          // Process the request and send response back to message broker
          const order = await Order.findById(orderId);

          // if(!order) return ...

          channel.assertQueue(msg.properties.replyTo, { durable: false });

          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(order))
          );

          channel.ack(msg);
        },
        { noAck: false }
      );
    });
  });
};

module.exports = { orderQueue };
