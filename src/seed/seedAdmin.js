require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin already exists');
      await mongoose.connection.close();
      process.exit(0);
    }

    await User.create({
      name: 'Administrator',
      username: 'admin',
      password: '123456',
      role: 'admin',
      isActive: true,
    });

    console.log('Admin created successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();
