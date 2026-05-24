const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/VAS_NEW')
  .then(async () => {
    try {
      const db = mongoose.connection.db;
      const indexes = await db.collection('funds').indexes();
      console.log(indexes);
    } catch (e) {
      console.log(e.message);
    }
    process.exit(0);
  });
