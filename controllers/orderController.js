const Order = require("../models/orderModel");
const amqp = require("amqplib/callback_api");

const uri = process.env.MESSAGE_BROKER;
const port = process.env.MESSAGE_BROKER_PORT;

const insertOrder = async (req, res) => {
  const { fromDate, duration, message } = req.body;
  const { kosId, roomId } = req.params;

  try {
    const order = await Order.create({
      fromDate,
      duration,
      message,
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

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    res.json({ order });
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

      console.log(`Sending request for kos with slug: ${kosSlug}`);

      channel.assertQueue("kos_queue_reply", { durable: false });

      channel.sendToQueue(queueName, Buffer.from(kosSlug), {
        replyTo: "kos_queue_reply",
      });

      channel.consume(
        "kos_queue_reply",
        async (msg) => {
          const kosDetail = JSON.parse(msg.content.toString());
          console.log(`Received response for kos with slug: ${kosSlug}`);

          const ordersPerKos = await Order.find({ kosId: kosDetail._id });
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

  const newStatus = parseInt(status) === 1 ? "accepted" : "rejected";

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

module.exports = { insertOrder, getOrder, getOrdersPerKos, verifyOrder };
