const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cognitest').then(async () => {
    await mongoose.connection.db.collection('ingestionjobs').updateMany({}, {$set: {status: 'PENDING'}});
    console.log('Reset jobs');
    process.exit(0);
});
