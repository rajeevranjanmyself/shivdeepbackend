const express = require("express");

const router = express.Router();

router.get("/privacy-policy", async (req, res) => {
  return res.render("privacypolicy");
});


module.exports = router;
