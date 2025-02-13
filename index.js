const express = require("express");
const path = require("path");
const fs = require('fs');
const cors = require('cors');
const https = require("https");
const cookieParser = require("cookie-parser");
const { restrictToLoggedinUserOnly, checkAuth } = require("./middlewares/auth");
const responseFormatter = require('./middlewares/responseFormator')
const userRoute = require("./routes/user");
const adminRoute = require("./routes/admin");
const eventsRoute = require("./routes/events");
const galleryRoute = require("./routes/gallery");
const blogsRoute = require("./routes/blogs");
const privacyPolicyRoute = require("./routes/privacyPolicy");
const termConditionRoute = require("./routes/termCondition");
const faqRoute = require("./routes/faq");
const contactusRoute = require("./routes/contactus");
const newsRoute = require("./routes/news");
const missionRoute = require("./routes/mission");

const app = express();
const PORT = process.env.PORT || 8002;
// Load SSL Certificate
const options = {
    key: fs.readFileSync("./privkey.pem"),
    cert: fs.readFileSync("./fullchain.pem")
  };
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
app.use("/api/v1/gallery", galleryRoute);
app.use("/api/v1/blogs", blogsRoute);
app.use("/api/v1/privacyPolicy", privacyPolicyRoute);
app.use("/api/v1/termCondition", termConditionRoute);
app.use("/api/v1/faq", faqRoute);
app.use("/api/v1/contactus", contactusRoute);
app.use("/api/v1/news", newsRoute);
app.use("/api/v1/mission", missionRoute);

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
// Create HTTPS Server
// https.createServer(options, app).listen(PORT, () => {
//     console.log(`🚀 HTTPS Server running at https://localhost:${PORT}`);
//   });