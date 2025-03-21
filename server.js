require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios'); // Added axios for fetching stock data
const connectDB = require('./config/db');
const Stock = require('./models/Stock');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB(); // Connect to MongoDB

app.use(cors());
app.use(helmet());
app.use(express.json());

/**
 * @route   GET /api/stocks
 * @desc    Get all stocks from the database
 */
app.get("/api/stocks", async (req, res) => {
    try {
        const stocks = await Stock.find();
        res.json(stocks);
    } catch (err) {
        console.error("Error fetching stocks:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @route   POST /api/stocks
 * @desc    Add or update stock in the database
 */
app.post("/api/stocks", async (req, res) => {
    try {
        const { symbol, name, price, change } = req.body;
        if (!symbol || !name || price === undefined || change === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if stock already exists
        let stock = await Stock.findOne({ symbol });

        if (stock) {
            // Update existing stock
            stock.price = price;
            stock.change = change;
            stock.lastUpdated = Date.now();
            await stock.save();
            return res.json(stock);
        }

        // Create new stock
        stock = new Stock({ symbol, name, price, change });
        await stock.save();

        res.status(201).json(stock);
    } catch (err) {
        console.error("Error adding/updating stock:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @route   PUT /api/stocks/:symbol
 * @desc    Update stock details
 */
app.put("/api/stocks/:symbol", async (req, res) => {
    try {
        const { price, change } = req.body;
        if (price === undefined || change === undefined) {
            return res.status(400).json({ error: "Missing price or change fields" });
        }

        const stock = await Stock.findOneAndUpdate(
            { symbol: req.params.symbol.toUpperCase() },
            { price, change, lastUpdated: Date.now() },
            { new: true }
        );

        if (!stock) return res.status(404).json({ error: "Stock not found" });
        res.json(stock);
    } catch (err) {
        console.error("Error updating stock:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @route   DELETE /api/stocks/:symbol
 * @desc    Delete a stock from the database
 */
app.delete("/api/stocks/:symbol", async (req, res) => {
    try {
        const stock = await Stock.findOneAndDelete({ symbol: req.params.symbol.toUpperCase() });

        if (!stock) return res.status(404).json({ error: "Stock not found" });

        res.json({ message: `Stock ${req.params.symbol.toUpperCase()} deleted successfully` });
    } catch (err) {
        console.error("Error deleting stock:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @route   GET /api/search/:symbol
 * @desc    Search for stock and store result in database
 */
app.get("/api/search/:symbol", async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();

        // Fetch stock data from external API (replace with real API)
        const apiResponse = await axios.get(`https://api.example.com/stocks/${symbol}`);
        const { name, price, change } = apiResponse.data;

        // Store or update in database
        let stock = await Stock.findOne({ symbol });

        if (stock) {
            stock.price = price;
            stock.change = change;
            stock.lastUpdated = Date.now();
            await stock.save();
        } else {
            stock = new Stock({ symbol, name, price, change });
            await stock.save();
        }

        res.json(stock);
    } catch (err) {
        console.error("Error fetching stock data:", err);
        res.status(500).json({ error: "Stock not found or API error" });
    }
});

// Serve React frontend
const frontendPath = path.join(__dirname, '../frontend/react-app/build');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            res.status(500).send('Frontend build not found. Run "npm run build" in frontend/react-app.');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
