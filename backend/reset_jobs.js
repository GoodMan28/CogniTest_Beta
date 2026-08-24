const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cognitest').then(async () => {
    const res = await mongoose.connection.db.collection('ingestionjobs').updateMany(
        { status: 'PROCESSING' },
        { $set: { status: 'PENDING', processedPages: 0 } }
    );
    console.log('Reset ' + res.modifiedCount + ' jobs from PROCESSING to PENDING.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
