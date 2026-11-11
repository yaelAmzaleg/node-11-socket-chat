const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = [];
const messages = [];

app.get("/api/messages", (req, res) => {
    res.json(messages.slice(-20));
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join", (nickname, callback) => {
        const trimmedNickname = typeof nickname === "string" ? nickname.trim() : "";

        if (!trimmedNickname) {
            return callback({ ok: false, error: "חובה להזין כינוי" });
        }

        if (users.includes(trimmedNickname)) {
            return callback({ ok: false, error: "הכינוי כבר תפוס" });
        }

        socket.data.nickname = trimmedNickname;
        users.push(trimmedNickname);

        callback({ ok: true });
        io.emit("system", `${trimmedNickname} הצטרפה לצ'אט`);
        io.emit("users", users);
    });

    socket.on("chat:message", (text) => {
        if (!socket.data.nickname) return;

        const trimmedText = typeof text === "string" ? text.trim() : "";
        if (!trimmedText) return;

        const messageObj = {
            nickname: socket.data.nickname,
            text: trimmedText,
            time: new Date().toISOString()
        };

        messages.push(messageObj);
        io.emit("chat:message", messageObj);
    });

    socket.on("typing", () => {
        if (!socket.data.nickname) return;
        socket.broadcast.emit("typing", socket.data.nickname);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        const nickname = socket.data.nickname;
        if (!nickname) return;

        const index = users.indexOf(nickname);
        if (index !== -1) {
            users.splice(index, 1);
        }

        io.emit("system", `${nickname} עזבה את הצ'אט`);
        io.emit("users", users);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:3000`);
});

