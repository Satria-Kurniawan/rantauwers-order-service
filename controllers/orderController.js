const Order = require("../models/orderModel");
const amqp = require("amqplib/callback_api");

const uri = process.env.MESSAGE_BROKER;
const port = process.env.MESSAGE_BROKER_PORT;

const insertOrder = async (req, res) => {
  const { fromDate, duration, message, amount } = req.body;
  const { kosId, roomId } = req.params;

  try {
    const order = await Order.create({
      fromDate,
      duration,
      message,
      amount,
      kosId,
      roomId,
      customerId: req.user._id,
    });

    res.status(201).json({
      message: "Berhasil melakukan pengajuan sewa kamar.",
      order,
    });
  } catch (error) {
    res.status(400).json({ error });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    amqp.connect(`${uri}:${port}`, (err, conn) => {
      if (err) throw err;

      conn.createChannel((err, channel) => {
        if (err) throw err;

        // room_queue
        const queueName = "room_queue";

        channel.assertQueue(queueName, {
          durable: false,
        });

        channel.assertQueue("room_queue_reply", { durable: false });

        channel.sendToQueue(queueName, Buffer.from(order.roomId), {
          replyTo: "room_queue_reply",
        });

        const roomPromise = new Promise((resolve, reject) => {
          channel.consume(
            "room_queue_reply",
            (msg) => {
              const room = JSON.parse(msg.content.toString());

              if (!room) reject("Error get room");

              resolve(room);
            },
            { noAck: true }
          );
        });
        // end room_queue

        roomPromise.then((room) => {
          // user_queue
          const queueName2 = "user_queue";

          channel.assertQueue(queueName2, {
            durable: false,
          });

          channel.assertQueue("user_queue_reply", { durable: false });

          channel.sendToQueue(queueName2, Buffer.from(order.customerId), {
            replyTo: "user_queue_reply",
          });

          channel.consume(
            "user_queue_reply",
            (msg) => {
              const user = JSON.parse(msg.content.toString());

              // if (!user) return res.json({ message: "Error get user" });

              res.json({ order, room, user });

              channel.close();
              conn.close();
            },
            { noAck: true }
          );
          // end user_queue
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getOrdersPerKos = async (req, res) => {
  const { kosSlug } = req.params;

  // Get detail kos dari merchant-service melalui Message Broker
  // Filter semua data orderan berdasarkan kosId
  amqp.connect(`${uri}:${port}`, (err, conn) => {
    if (err) throw err;

    conn.createChannel((err, channel) => {
      if (err) throw err;

      const queueName = "kos_queue";

      channel.assertQueue(queueName, {
        durable: false,
      });

      channel.assertQueue("kos_queue_reply", { durable: false });

      channel.sendToQueue(queueName, Buffer.from(kosSlug), {
        replyTo: "kos_queue_reply",
      });

      channel.consume(
        "kos_queue_reply",
        async (msg) => {
          const kosDetail = JSON.parse(msg.content.toString());

          const ordersPerKos = await Order.find({ kosId: kosDetail._id });

          // if (!ordersPerKos)
          //   return res.json({ message: "Error get orders per kos" });

          res.json({ ordersPerKos });

          channel.close();
          conn.close();
        },
        { noAck: true }
      );
    });
  });
};

const verifyOrder = async (req, res) => {
  const { status } = req.body;

  const newStatus = parseInt(status) === 1 ? "ACCEPTED" : "REJECTED";

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: newStatus },
      { new: true }
    );

    const msg =
      parseInt(status) === 1
        ? "Pengajuan sewa disetujui."
        : "Pengajuan sewa ditolak.";

    res.json({ message: msg, order });
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports = {
  insertOrder,
  getOrdersByCustomer,
  getOrder,
  getOrdersPerKos,
  verifyOrder,
};
