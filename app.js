const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const port = process.env.PORT || 6003;
const connectToDatabase = require("./config/database");
const { errorHandler } = require("./middlewares/errorHandler");
const { orderQueue } = require("./messageBroker/orderQueue");

connectToDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/order", require("./routes/orderRoutes"));

// Message Broker
orderQueue();
//

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Order service ready on port ${port}`);
});
