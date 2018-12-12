const express = require("express");
const app = express();
const port = 3000 || process.env.PORT;

app.use("static", express.static("static"));

app.get('/', (req, res) => res.sendFile(__dirname + "/views/index.html"));

app.listen(port, () => console.log("Example app listening on port ${port}!"));