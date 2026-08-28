require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const initLocationSocket = require('./sockets/locationSocket');

const authRoutes = require('./routes/auth');
const touristRoutes = require('./routes/tourist');
const geofenceRoutes = require('./routes/geofence');
const sosRoutes = require('./routes/sos');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST'] },
});

app.set('io', io); // so REST routes (e.g. SOS fallback) can emit too

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AtithiBandhu API' }));

app.use('/api/auth', authRoutes);
app.use('/api/tourist', touristRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/sos', sosRoutes);

initLocationSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`[AtithiBandhu API] listening on port ${PORT}`));
});
