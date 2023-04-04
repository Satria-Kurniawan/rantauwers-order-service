const amqp = require("amqplib/callback_api");
const Order = require("../models/orderModel");

const uri = process.env.MESSAGE_BROKER;
const port = process.env.MESSAGE_BROKER_PORT;

// Memproduksi detail order
const publishOrder = () => {
  amqp.connect(`${uri}:${port}`, (err, conn) => {
    if (err) throw err;

    conn.createChannel((err, channel) => {
      if (err) throw err;

      const queueName = "order_queue";

      channel.assertQueue(queueName, {
        durable: false,
      });

      channel.consume(
        queueName,
        async (msg) => {
          const orderId = msg.content.toString();

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

// Mengubah status order ke UNPAID
const subscribeTransactionEvent = () => {
  amqp.connect(`${uri}:${port}`, (err, conn) => {
    if (err) throw err;

    conn.createChannel((err, channel) => {
      if (err) throw err;

      const queueName = "transaction_created";

      channel.assertQueue(queueName, {
        durable: false,
      });

      channel.consume(
        queueName,
        async (msg) => {
          const orderId = msg.content.toString();

          const order = await Order.findById(orderId);

          if (!order) return;

          order.status = "UNPAID";
          order.save();

          // channel.ack(msg);
        },
        { noAck: true }
      );
    });
  });
};

module.exports = { publishOrder, subscribeTransactionEvent };
