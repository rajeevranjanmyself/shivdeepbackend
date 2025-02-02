const express = require("express");
const path = require("path");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const { restrictToLoggedinUserOnly, checkAuth } = require("./middlewares/auth");
const responseFormatter = require('./middlewares/responseFormator')
const userRoute = require("./routes/user");
const adminRoute = require("./routes/admin");
const eventsRoute = require("./routes/events");


const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());
//app.use(morgan('dev'));
app.use(responseFormatter)
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));

app.use("/api/v1", userRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/events", eventsRoute);

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
