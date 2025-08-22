const { Expense, Trip } = require('../models');

const expenseController = {
    async createExpense(req, res) {
        try {
            const userId = req.user.id;
            const {
                trip_id,
                category,
                amount,
                currency,
                description,
                expense_date,
                base_amount,
                base_currency,
                exchange_rate
            } = req.body;

            const expenseId = await Expense.create({
                trip_id,
                user_id: userId,
                category,
                amount,
                currency,
                description,
                expense_date,
                base_amount,
                base_currency,
                exchange_rate
            });

            // Use model method to fetch the created expense
            const expense = await Expense.findById(expenseId);
            res.status(201).json(expense);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    async getExpenses(req, res) {
        try {
            const userId = req.user.id;
            const { trip_id } = req.query;

            let expenses;
            if (trip_id) {
                expenses = await Expense.findByTripId(trip_id, userId);
            } else {
                expenses = await Expense.findByUserId(userId);
            }

            res.json(expenses);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    async getExpenseSummary(req, res) {
        try {
            const userId = req.user.id;
            const summary = await Expense.getExpenseSummary(userId);
            res.json(summary);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    async deleteExpense(req, res) {
        try {
            const userId = req.user.id;
            const expenseId = req.params.id;
            const affectedRows = await Expense.delete(expenseId, userId);

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Expense not found' });
            }

            res.json({ message: 'Expense deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = expenseController;